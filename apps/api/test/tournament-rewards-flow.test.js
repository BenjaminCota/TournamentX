const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'organizer-results-flow', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

test('la final oficial de un torneo libera el premio del campeón local', async () => {
  const suffix = Date.now();
  const tournament = await request(app).post('/api/tournaments').set(authorization).send({ name: `Copa con premio ${suffix}`, game: 'Valorant', format: 'SINGLE_ELIMINATION', maxTeams: 2 });
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(authorization).send({ teamId: 'team-lnx', teamName: 'Equipo Oro', seed: 1 });
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(authorization).send({ teamId: 'team-titans', teamName: 'Equipo Plata', seed: 2 });
  const bracket = await request(app).post(`/api/tournaments/${tournament.body.id}/bracket/generate`).set(authorization);
  await request(app).put(`/api/tournaments/${tournament.body.id}/bracket-matches/${bracket.body[0].matches[0].id}/result`).set(authorization).send({ score1: 2, score2: 0 });

  const sponsor = await request(app).post('/api/sponsors').set(authorization).send({ name: `Patrocinador ${suffix}`, contactEmail: `sponsor-${suffix}@example.test` });
  const pool = await request(app).post('/api/prize-pools').set(authorization).send({ tournamentId: tournament.body.id, name: `Bolsa ${suffix}`, currency: 'USD' });
  const contribution = await request(app).post(`/api/prize-pools/${pool.body.data.id}/contributions`).set(authorization).send({ sponsorId: sponsor.body.data.id, amount: 100, provider: 'stripe', idempotencyKey: `winner-${suffix}` });
  await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/test-authorize`).set(authorization);
  await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/capture`).set(authorization);
  const distribution = await request(app).put(`/api/prize-pools/${pool.body.data.id}/distribution`).set(authorization).send({ rules: [{ position: 1, percentage: 100 }] });
  assert.equal(distribution.status, 200);

  const imported = await request(app).post(`/api/prize-pools/${pool.body.data.id}/results`).set(authorization);
  assert.equal(imported.status, 201);
  assert.equal(imported.body.data.payout.recipientId, 'team-lnx');
  assert.equal(imported.body.data.payout.amount, 100);
  const receipt = await request(app).get(`/api/receipts/${imported.body.data.payout.receiptCode}`).set(authorization);
  assert.equal(receipt.status, 200);
});
