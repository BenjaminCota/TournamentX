const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const stripeGateway = require('../src/services/stripe-gateway');

test('crea una cuenta Express que solo solicita transferencias', async () => {
  let payload;
  const client = {
    accounts: {
      create: async (input) => {
        payload = input;
        return { id: 'acct_test_captain' };
      },
    },
  };

  const account = await stripeGateway.createConnectedAccount({
    userId: 'user-captain',
    email: 'captain@tournamentx.local',
  }, client);

  assert.equal(account.id, 'acct_test_captain');
  assert.equal(payload.type, 'express');
  assert.deepEqual(payload.capabilities, { transfers: { requested: true } });
  assert.equal(payload.metadata.tournamentxUserId, 'user-captain');
});

test('genera enlaces alojados de incorporación y Panel Express', async () => {
  let onboardingPayload;
  const client = {
    accountLinks: {
      create: async (input) => {
        onboardingPayload = input;
        return { url: 'https://connect.stripe.test/onboarding', expires_at: 123 };
      },
    },
    accounts: {
      createLoginLink: async (accountId) => ({ url: `https://connect.stripe.test/${accountId}` }),
    },
  };

  const onboarding = await stripeGateway.createConnectOnboardingLink('acct_test_captain', client);
  const dashboard = await stripeGateway.createConnectDashboardLink('acct_test_captain', client);

  assert.equal(onboardingPayload.account, 'acct_test_captain');
  assert.equal(onboardingPayload.type, 'account_onboarding');
  assert.match(onboardingPayload.return_url, /stripe_connect=return/);
  assert.match(onboardingPayload.refresh_url, /stripe_connect=refresh/);
  assert.match(onboarding.url, /^https:\/\//);
  assert.match(dashboard.url, /acct_test_captain/);
});

test('una cuenta nueva se muestra como registro pendiente y no como error', () => {
  const service = require('../src/modules/stripe-connect/stripe-connect.service');
  const status = service.statusFromStripe({
    id: 'acct_test_captain',
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
    requirements: { disabled_reason: 'requirements.past_due', currently_due: ['individual.first_name'] },
  });

  assert.equal(status.status, 'onboarding_required');
  assert.equal(status.requirementsDue, 1);
});

test('crea una transferencia idempotente hacia la cuenta del ganador', async () => {
  let payload;
  let options;
  const client = {
    transfers: {
      create: async (input, requestOptions) => {
        payload = input;
        options = requestOptions;
        return { id: 'tr_test_prize' };
      },
    },
  };

  const transfer = await stripeGateway.createTransfer({
    amount: 12.34,
    currency: 'MXN',
    destination: 'acct_test_captain',
    prizePoolId: 'pool-test',
    recipientId: 'team-lnx',
    position: 1,
  }, client);

  assert.equal(transfer.id, 'tr_test_prize');
  assert.equal(payload.amount, 1234);
  assert.equal(payload.currency, 'mxn');
  assert.equal(payload.destination, 'acct_test_captain');
  assert.equal(payload.transfer_group, 'tournamentx:pool-test');
  assert.equal(options.idempotencyKey, 'tournamentx-payout:pool-test:1');
});

test('resuelve el premio de un equipo únicamente hacia su capitán', () => {
  const service = require('../src/modules/stripe-connect/stripe-connect.service');
  assert.equal(service.captainForRecipient('team-lnx'), 'user-captain');
  assert.throws(() => service.captainForRecipient('unknown-team'), /equipo con capitán/);
});

test('solo el capitán puede consultar su configuración de cobro', async () => {
  const captainLogin = await request(app).post('/api/auth/login').send({
    email: 'captain@tournamentx.local',
    password: 'Captain123!',
  }).expect(200);
  const playerLogin = await request(app).post('/api/auth/login').send({
    email: 'player@tournamentx.local',
    password: 'Player123!',
  }).expect(200);

  const captainStatus = await request(app)
    .get('/api/stripe/connect/status')
    .set('Authorization', `Bearer ${captainLogin.body.token}`)
    .expect(200);
  await request(app)
    .get('/api/stripe/connect/status')
    .set('Authorization', `Bearer ${playerLogin.body.token}`)
    .expect(403);

  assert.equal(captainStatus.body.data.status, 'not_created');
  assert.equal(captainStatus.body.data.payoutsEnabled, false);
});
