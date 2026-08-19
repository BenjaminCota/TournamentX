const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const { createRealtimeServer } = require('../src/server');

function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No se recibió ${event}`)), 3000);
    socket.once(event, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

test('Dev 4 emite match-update solo para la sala del partido', async () => {
  const { server, io } = createRealtimeServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const client = createClient(`http://127.0.0.1:${address.port}`, { transports: ['websocket'] });
  const token = jwt.sign({ sub: 'organizer-score-realtime', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret');
  const managerToken = jwt.sign({ sub: 'organizer-realtime', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret');

  try {
    const health = await request(app).get('/api/health');
    assert.equal(health.body.realtime.status, 'ready');
    await waitFor(client, 'connect');
    const tournament = await request(app).post('/api/tournaments').set({ Authorization: `Bearer ${managerToken}` }).send({
      name: `Torneo en tiempo real ${Date.now()}`,
      game: 'Valorant',
      maxTeams: 2,
    });
    assert.equal(tournament.status, 201);
    for (const [index, teamId] of ['team-lnx', 'team-titans'].entries()) {
      const participant = await request(app).post(`/api/tournaments/${tournament.body.id}/participants`)
        .set({ Authorization: `Bearer ${managerToken}` })
        .send({ teamId, seed: index + 1 });
      assert.equal(participant.status, 201);
    }
    const created = await request(app).post('/api/matches').set({ Authorization: `Bearer ${managerToken}` }).send({
      tournamentId: tournament.body.id, team1Id: 'team-lnx', team2Id: 'team-titans', scheduledAt: '2026-08-25T18:00:00.000Z',
    });
    assert.equal(created.status, 201);

    await new Promise((resolve) => client.emit('subscribe-match', created.body.id, resolve));
    const updateEvent = waitFor(client, 'match-update');
    const updated = await request(app).patch(`/api/matches/${created.body.id}/score`)
      .set('Authorization', `Bearer ${token}`)
      .send({ team1Score: 1, team2Score: 0, status: 'live' });

    assert.equal(updated.status, 200);
    const event = await updateEvent;
    assert.equal(event.id, created.body.id);
    assert.deepEqual(event.score, { team1: 1, team2: 0 });
  } finally {
    client.disconnect();
    io.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
