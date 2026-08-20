const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

const secret = process.env.JWT_SECRET || 'development-only-secret';
const organizer = { Authorization: `Bearer ${jwt.sign({ sub: 'e2e-organizer', role: 'organizer' }, secret)}` };

test('recorrido E2E: equipos, torneo, calendario, resultado, notificación y premio', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const captainOne = { Authorization: `Bearer ${jwt.sign({ sub: `e2e-captain-one-${suffix}`, role: 'captain' }, secret)}` };
  const captainTwo = { Authorization: `Bearer ${jwt.sign({ sub: `e2e-captain-two-${suffix}`, role: 'captain' }, secret)}` };
  const teamIds = [];
  for (const [index, label] of ['Alfa', 'Beta'].entries()) {
    const team = await request(app).post('/api/teams').set(index === 0 ? captainOne : captainTwo).send({
      name: `E2E-${label}-${suffix.slice(-8)}`,
      abbreviation: `${label[0]}${suffix.slice(-5)}`,
      sport: 'Valorant', region: 'LATAM', competitionType: 'Pruebas', description: '', status: 'active',
    });
    assert.equal(team.status, 201);
    teamIds.push(team.body.id);
  }

  const tournament = await request(app).post('/api/tournaments').set(organizer).send({
    name: `Copa E2E ${suffix}`, game: 'Valorant', format: 'SINGLE_ELIMINATION', maxTeams: 2,
  });
  assert.equal(tournament.status, 201);
  for (const [index, teamId] of teamIds.entries()) {
    const participant = await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(organizer).send({ teamId, seed: index + 1 });
    assert.equal(participant.status, 201);
  }

  const schedule = await request(app).post('/api/schedules').set(organizer).send({
    tournamentId: tournament.body.id, teamIds, startsAt: '2026-10-01T18:00:00.000Z', slotMinutes: 60,
    venue: 'Arena E2E', mode: 'best_of_3', format: 'round_robin',
  });
  assert.equal(schedule.status, 201);
  assert.equal(schedule.body.matches.length, 1);

  const live = await request(app).patch(`/api/matches/${schedule.body.matches[0].id}/score`).set(organizer).send({ team1Score: 2, team2Score: 0, status: 'live' });
  assert.equal(live.status, 200);
  const completed = await request(app).patch(`/api/matches/${schedule.body.matches[0].id}/score`).set(organizer).send({ status: 'completed' });
  assert.equal(completed.status, 200);

  const notifications = await request(app).get('/api/geolocation/notifications');
  assert.ok(notifications.body.some((item) => item.type === 'result' && item.message.includes(teamIds[0]) && item.message.includes(teamIds[1])));

  const bracket = await request(app).post(`/api/tournaments/${tournament.body.id}/bracket/generate`).set(organizer);
  assert.equal(bracket.status, 201);
  const final = bracket.body[0].matches[0];
  const official = await request(app).put(`/api/tournaments/${tournament.body.id}/bracket-matches/${final.id}/result`).set(organizer).send({ score1: 2, score2: 0 });
  assert.equal(official.status, 200);

  const sponsor = await request(app).post('/api/sponsors').set(organizer).send({ name: `Patrocinador E2E ${suffix}`, contactEmail: `e2e-${suffix}@example.test` });
  assert.equal(sponsor.status, 201);
  const pool = await request(app).post('/api/prize-pools').set(organizer).send({ tournamentId: tournament.body.id, name: `Bolsa E2E ${suffix}`, currency: 'USD' });
  assert.equal(pool.status, 201);
  const contribution = await request(app).post(`/api/prize-pools/${pool.body.data.id}/contributions`).set(organizer).send({ sponsorId: sponsor.body.data.id, amount: 250, provider: 'stripe', idempotencyKey: `e2e-${suffix}` });
  assert.equal(contribution.status, 201);
  assert.equal((await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/test-authorize`).set(organizer)).status, 200);
  assert.equal((await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/capture`).set(organizer)).status, 200);
  assert.equal((await request(app).put(`/api/prize-pools/${pool.body.data.id}/distribution`).set(organizer).send({ rules: [{ position: 1, percentage: 100 }] })).status, 200);

  const reward = await request(app).post(`/api/prize-pools/${pool.body.data.id}/results`).set(organizer);
  assert.equal(reward.status, 201);
  assert.equal(reward.body.data.winner.recipientId, teamIds[0]);
  assert.equal(reward.body.data.rule.amount, 250);
  assert.equal((await request(app).post(`/api/prize-pools/${pool.body.data.id}/claim`).set(captainTwo)).status, 403);
  const claimed = await request(app).post(`/api/prize-pools/${pool.body.data.id}/claim`).set(captainOne).send({ payoutMethod: { type: 'card', brand: 'visa', last4: '4242', cardholderName: 'Capitán E2E' } });
  assert.equal(claimed.status, 201);
  assert.equal(claimed.body.data.payout.recipientId, teamIds[0]);
  assert.equal(claimed.body.data.payout.amount, 250);
  assert.equal((await request(app).get(`/api/receipts/${claimed.body.data.payout.receiptCode}`).set(captainOne)).status, 200);
});
