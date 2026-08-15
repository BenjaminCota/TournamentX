const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('Dev 4 expone y filtra partidos programados', async () => {
  const response = await request(app).get('/api/matches?tournamentId=tour-1&status=scheduled');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.some((match) => match.id === 'match-201'));
});

test('Dev 4 crea un partido y permite consultarlo', async () => {
  const created = await request(app).post('/api/matches').send({
    tournamentId: 'tour-2',
    scheduleId: 'schedule-02',
    roundId: 'round-1',
    team1Id: 'team-lnx',
    team2Id: 'team-titans',
    scheduledAt: '2026-08-21T19:00:00.000Z',
    venue: 'Lobby MX-01',
    mode: 'best_of_3',
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'scheduled');
  assert.deepEqual(created.body.score, { team1: 0, team2: 0 });

  const detail = await request(app).get(`/api/matches/${created.body.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.tournamentId, 'tour-2');
});

test('Dev 4 valida partidos y devuelve 404 para IDs desconocidos', async () => {
  const invalid = await request(app).post('/api/matches').send({
    tournamentId: 'tour-1',
    team1Id: 'team-lnx',
    team2Id: 'team-lnx',
    scheduledAt: '2026-08-21T19:00:00.000Z',
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /datos de entrada inválidos/i);

  const missing = await request(app).get('/api/matches/unknown-match');
  assert.equal(missing.status, 404);
  assert.match(missing.body.error, /partido no encontrado/i);
});
