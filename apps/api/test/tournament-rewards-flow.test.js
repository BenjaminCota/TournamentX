const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'organizer-results-flow', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };
const captain = { Authorization: `Bearer ${jwt.sign({ sub: 'user-captain', role: 'captain' }, process.env.JWT_SECRET || 'development-only-secret')}` };
const otherCaptain = { Authorization: `Bearer ${jwt.sign({ sub: 'other-captain', role: 'captain' }, process.env.JWT_SECRET || 'development-only-secret')}` };
const payoutMethod = { type: 'card', brand: 'visa', last4: '4242', cardholderName: 'Capitán Luminex' };

test('la final oficial reserva el premio y solo su capitán puede cobrarlo', async () => {
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
  assert.equal(imported.body.data.winner.recipientId, 'team-lnx');
  assert.equal(imported.body.data.rule.amount, 100);
  const claimable = await request(app).get('/api/prize-pools/claimable').set(captain);
  assert.equal(claimable.status, 200);
  assert.ok(claimable.body.data.some((item) => item.prizePoolId === pool.body.data.id && item.status === 'claimable'));
  assert.equal((await request(app).post(`/api/prize-pools/${pool.body.data.id}/claim`).set(otherCaptain)).status, 403);
  assert.equal((await request(app).post(`/api/prize-pools/${pool.body.data.id}/payouts`).set(authorization).send({ recipientId: 'team-lnx', position: 1 })).status, 403);
  const claimed = await request(app).post(`/api/prize-pools/${pool.body.data.id}/claim`).set(captain).send({ payoutMethod });
  assert.equal(claimed.status, 201);
  assert.equal(claimed.body.data.payout.recipientId, 'team-lnx');
  assert.equal(claimed.body.data.payout.amount, 100);
  assert.deepEqual(claimed.body.data.payout.payoutMethod, payoutMethod);
  const receipt = await request(app).get(`/api/receipts/${claimed.body.data.payout.receiptCode}`).set(captain);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.body.data.paymentMode, 'simulated');
  assert.equal(receipt.body.data.payoutMethod.last4, '4242');
  const repeated = await request(app).post(`/api/prize-pools/${pool.body.data.id}/claim`).set(captain);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.data.reused, true);
});
