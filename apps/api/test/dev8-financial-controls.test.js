const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const stripeConnectService = require('../src/modules/stripe-connect/stripe-connect.service');

const secret = process.env.JWT_SECRET || 'development-only-secret';
const auth = (sub, role) => ({ Authorization: `Bearer ${jwt.sign({ sub, role }, secret)}` });
const admin = auth('user-admin', 'admin');
const organizer = auth('organizer-financial-controls', 'organizer');
const player = auth('player-financial-controls', 'player');

test('comisión, reembolso, permisos y conciliación completan el flujo financiero', async () => {
  assert.equal((await request(app).get('/api/payment-settings').set(admin)).status, 200);
  assert.equal((await request(app).get('/api/payment-settings').set(organizer)).status, 200);
  assert.equal((await request(app).get('/api/payment-settings').set(player)).status, 403);
  assert.equal((await request(app).put('/api/payment-settings').set(organizer).send({ platformFeePercentage: 7 })).status, 403);

  const updatedSettings = await request(app).put('/api/payment-settings').set(admin).send({ platformFeePercentage: 7 });
  assert.equal(updatedSettings.status, 200);
  assert.equal(updatedSettings.body.data.platformFeePercentage, 7);

  const suffix = Date.now();
  const pool = await request(app).post('/api/prize-pools').set(admin).send({
    tournamentId: `tournament-financial-${suffix}`,
    name: `Bolsa financiera ${suffix}`,
    currency: 'USD',
  });
  assert.equal(pool.status, 201);

  const contribute = async (amount) => {
    const created = await request(app).post(`/api/prize-pools/${pool.body.data.id}/contributions`).set(admin).send({
      sponsorId: 'sponsor-local-01', amount, provider: 'stripe', idempotencyKey: `financial-${suffix}-${amount}`,
    });
    assert.equal(created.status, 201);
    await request(app).post(`/api/contributions/${created.body.data.id}/stripe/test-authorize`).set(admin).expect(200);
    await request(app).post(`/api/contributions/${created.body.data.id}/stripe/capture`).set(admin).expect(200);
    return created.body.data.id;
  };

  const refundedContributionId = await contribute(100);
  const refunded = await request(app).post(`/api/contributions/${refundedContributionId}/stripe/refund`).set(admin);
  assert.equal(refunded.status, 200);
  assert.equal(refunded.body.data.status, 'refunded');
  assert.equal((await request(app).post(`/api/contributions/${refundedContributionId}/stripe/refund`).set(admin)).body.reused, true);

  const paidContributionId = await contribute(200);
  await request(app).put(`/api/prize-pools/${pool.body.data.id}/distribution`).set(admin).send({ rules: [{ position: 1, percentage: 100 }] }).expect(200);
  assert.equal((await request(app).post(`/api/contributions/${paidContributionId}/stripe/refund`).set(admin)).status, 409);

  const payout = await request(app).post(`/api/prize-pools/${pool.body.data.id}/payouts`).set(admin).send({ recipientId: 'team-financial-winner', position: 1 });
  assert.equal(payout.status, 201);
  assert.equal(payout.body.data.amount, 200);
  assert.equal(payout.body.data.platformFeeAmount, 14);
  assert.equal(payout.body.data.netAmount, 186);

  const reconciliation = await request(app).get(`/api/prize-pools/${pool.body.data.id}/reconciliation`).set(admin);
  assert.equal(reconciliation.status, 200);
  assert.equal(reconciliation.body.data.refunded, 100);
  assert.equal(reconciliation.body.data.platformFees, 14);
  assert.equal(reconciliation.body.data.transferred, 186);
  assert.ok(reconciliation.body.data.events.length >= 2);

  const retryPool = await request(app).post('/api/prize-pools').set(admin).send({
    tournamentId: `tournament-retry-${suffix}`,
    name: `Bolsa con reintento ${suffix}`,
    currency: 'USD',
  });
  const retryContribution = await request(app).post(`/api/prize-pools/${retryPool.body.data.id}/contributions`).set(admin).send({
    sponsorId: 'sponsor-local-01', amount: 50, provider: 'stripe', idempotencyKey: `retry-${suffix}`,
  });
  await request(app).post(`/api/contributions/${retryContribution.body.data.id}/stripe/test-authorize`).set(admin).expect(200);
  await request(app).post(`/api/contributions/${retryContribution.body.data.id}/stripe/capture`).set(admin).expect(200);
  await request(app).put(`/api/prize-pools/${retryPool.body.data.id}/distribution`).set(admin).send({ rules: [{ position: 1, percentage: 100 }] }).expect(200);

  const originalMode = env.stripeMode;
  const originalCreatePrizeTransfer = stripeConnectService.createPrizeTransfer;
  let attempts = 0;
  env.stripeMode = 'test';
  stripeConnectService.createPrizeTransfer = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('Fallo controlado para validar el reintento');
    return { destination: 'acct_retry_test', providerReference: 'tr_retry_test' };
  };
  try {
    const firstAttempt = await request(app).post(`/api/prize-pools/${retryPool.body.data.id}/payouts`).set(admin).send({ recipientId: 'team-retry-winner', position: 1 });
    assert.equal(firstAttempt.status, 500);
    const secondAttempt = await request(app).post(`/api/prize-pools/${retryPool.body.data.id}/payouts`).set(admin).send({ recipientId: 'team-retry-winner', position: 1 });
    assert.equal(secondAttempt.status, 201);
    assert.equal(secondAttempt.body.data.attemptCount, 2);
    const retryReconciliation = await request(app).get(`/api/prize-pools/${retryPool.body.data.id}/reconciliation`).set(admin);
    assert.ok(retryReconciliation.body.data.events.some((event) => event.eventType === 'failed'));
    assert.ok(retryReconciliation.body.data.events.some((event) => event.eventType === 'retried'));
  } finally {
    env.stripeMode = originalMode;
    stripeConnectService.createPrizeTransfer = originalCreatePrizeTransfer;
  }

  await request(app).put('/api/payment-settings').set(admin).send({ platformFeePercentage: 5 }).expect(200);
});
