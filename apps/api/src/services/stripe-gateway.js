const Stripe = require('stripe');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

const ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

function toMinorUnits(amount, currency) {
  const normalizedCurrency = currency.toUpperCase();
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100;
  return Math.round(Number(amount) * multiplier);
}

function createClient() {
  if (!env.stripeSecretKey) throw new HttpError(503, 'Falta STRIPE_SECRET_KEY');
  if (env.stripeMode === 'test' && !env.stripeSecretKey.startsWith('sk_test_')) {
    throw new HttpError(503, 'STRIPE_MODE=test requiere una clave sk_test_');
  }
  return new Stripe(env.stripeSecretKey);
}

async function authorizePayment({ amount, currency, reference, idempotencyKey, client = createClient() }) {
  const paymentIntent = await client.paymentIntents.create(
    {
      amount: toMinorUnits(amount, currency),
      currency: currency.toLowerCase(),
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { tournamentxReference: String(reference) }
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  return {
    providerReference: paymentIntent.id,
    status: 'pending',
    checkoutUrl: null,
    clientSecret: paymentIntent.client_secret,
    metadata: {
      simulated: false,
      environment: 'test',
      captureMethod: paymentIntent.capture_method,
      providerStatus: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }
  };
}

async function capturePayment(providerReference, client = createClient()) {
  const paymentIntent = await client.paymentIntents.capture(providerReference);
  return { providerReference: paymentIntent.id, providerStatus: paymentIntent.status };
}

async function cancelPayment(providerReference, client = createClient()) {
  const paymentIntent = await client.paymentIntents.cancel(providerReference);
  return { providerReference: paymentIntent.id, providerStatus: paymentIntent.status };
}

async function refundPayment(providerReference, client = createClient()) {
  const refund = await client.refunds.create({ payment_intent: providerReference });
  return { providerReference: refund.id, providerStatus: refund.status };
}

async function confirmTestPayment(providerReference, client = createClient()) {
  if (env.nodeEnv === 'production' || env.stripeMode !== 'test') throw new HttpError(404, 'Confirmación Stripe Test no disponible');
  const paymentIntent = await client.paymentIntents.confirm(providerReference, {
    payment_method: 'pm_card_visa',
    return_url: 'http://localhost:4173',
  });
  return { providerReference: paymentIntent.id, providerStatus: paymentIntent.status };
}

async function retrievePayment(providerReference, client = createClient()) {
  const paymentIntent = await client.paymentIntents.retrieve(providerReference);
  return { providerReference: paymentIntent.id, providerStatus: paymentIntent.status };
}

function constructWebhookEvent(payload, signature, client = createClient()) {
  if (!env.stripeWebhookSecret) throw new HttpError(503, 'Falta STRIPE_WEBHOOK_SECRET');
  return client.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}

async function createConnectedAccount({ userId, email }, client = createClient()) {
  return client.accounts.create({
    type: 'express',
    email,
    capabilities: { transfers: { requested: true } },
    metadata: { tournamentxUserId: String(userId) },
  });
}

async function retrieveConnectedAccount(accountId, client = createClient()) {
  return client.accounts.retrieve(accountId);
}

async function createConnectOnboardingLink(accountId, client = createClient()) {
  return client.accountLinks.create({
    account: accountId,
    refresh_url: env.stripeConnectRefreshUrl,
    return_url: env.stripeConnectReturnUrl,
    type: 'account_onboarding',
  });
}

async function createConnectDashboardLink(accountId, client = createClient()) {
  return client.accounts.createLoginLink(accountId);
}

async function createTransfer({ amount, currency, destination, prizePoolId, recipientId, position, attempt = 1 }, client = createClient()) {
  return client.transfers.create(
    {
      amount: toMinorUnits(amount, currency),
      currency: currency.toLowerCase(),
      destination,
      transfer_group: `tournamentx:${prizePoolId}`,
      metadata: {
        tournamentxPrizePoolId: String(prizePoolId),
        tournamentxRecipientId: String(recipientId),
        tournamentxPosition: String(position),
      },
    },
    { idempotencyKey: `tournamentx-payout:${prizePoolId}:${position}${attempt > 1 ? `:${attempt}` : ''}` },
  );
}

module.exports = {
  authorizePayment,
  capturePayment,
  cancelPayment,
  refundPayment,
  confirmTestPayment,
  retrievePayment,
  constructWebhookEvent,
  createConnectedAccount,
  retrieveConnectedAccount,
  createConnectOnboardingLink,
  createConnectDashboardLink,
  createTransfer,
  toMinorUnits,
};
