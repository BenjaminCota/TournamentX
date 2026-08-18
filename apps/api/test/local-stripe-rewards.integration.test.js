process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const env = require('../src/config/env');
const paymentGateway = require('../src/services/payment-gateway');
const stripeGateway = require('../src/services/stripe-gateway');

env.stripeMode = 'test';
env.paymentsMode = 'simulated';
env.stripePublishableKey = 'pk_test_tournamentx_public';
env.stripeSecretKey = 'sk_test_tournamentx_server';

const originalCreatePayment = paymentGateway.createPayment;
const originalRetrievePayment = stripeGateway.retrievePayment;
const originalCapturePayment = stripeGateway.capturePayment;
const originalRefundPayment = stripeGateway.refundPayment;

paymentGateway.createPayment = async () => ({
  providerReference: 'pi_local_rewards_test',
  status: 'pending',
  clientSecret: 'pi_local_rewards_test_secret_example',
  metadata: { simulated: false, environment: 'test' },
});
stripeGateway.retrievePayment = async () => ({ providerReference: 'pi_local_rewards_test', providerStatus: 'requires_capture' });
stripeGateway.capturePayment = async () => ({ providerReference: 'pi_local_rewards_test', providerStatus: 'succeeded' });
stripeGateway.refundPayment = async () => ({ providerReference: 're_local_rewards_test', providerStatus: 'succeeded' });

const app = require('../src/app');
const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'user-admin', role: 'admin', email: 'admin@localhost' }, env.jwtSecret)}` };

test.after(() => {
  paymentGateway.createPayment = originalCreatePayment;
  stripeGateway.retrievePayment = originalRetrievePayment;
  stripeGateway.capturePayment = originalCapturePayment;
  stripeGateway.refundPayment = originalRefundPayment;
});

test('conecta Stripe Test con la bolsa local sin exponer secretos', async () => {
  const config = await request(app).get('/api/payment-settings/config').expect(200);
  assert.equal(config.body.data.stripeMode, 'test');
  assert.equal(config.body.data.stripePublishableKey, 'pk_test_tournamentx_public');
  assert.equal('stripeSecretKey' in config.body.data, false);

  const created = await request(app)
    .post('/api/prize-pools/pool-local-01/contributions')
    .set(authorization)
    .send({ sponsorId: 'sponsor-local-01', amount: 25, provider: 'stripe', idempotencyKey: 'local-stripe-rewards-test' })
    .expect(201);

  assert.equal(created.body.payment.mode, 'stripe-test-local');
  assert.equal(created.body.payment.clientSecret, 'pi_local_rewards_test_secret_example');
  assert.equal('paymentClientSecret' in created.body.data, false);

  const contributionId = created.body.data.id;
  await request(app).post(`/api/contributions/${contributionId}/stripe/test-authorize`).set(authorization).expect(200);
  const captured = await request(app).post(`/api/contributions/${contributionId}/stripe/capture`).set(authorization).expect(200);
  assert.equal(captured.body.data.status, 'paid');
  assert.equal(captured.body.providerStatus, 'succeeded');

  const funded = await request(app).get('/api/prize-pools/pool-local-01').set(authorization).expect(200);
  assert.equal(Number(funded.body.data.fundedAmount), 25);

  const refunded = await request(app).post(`/api/contributions/${contributionId}/stripe/refund`).set(authorization).expect(200);
  assert.equal(refunded.body.data.status, 'refunded');
  assert.equal(refunded.body.data.providerRefundReference, 're_local_rewards_test');

  const reconciled = await request(app).get('/api/prize-pools/pool-local-01/reconciliation').set(authorization).expect(200);
  assert.equal(Number(reconciled.body.data.available), 0);
  assert.equal(Number(reconciled.body.data.refunded), 25);
});
