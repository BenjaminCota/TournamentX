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

async function confirmTestPayment(providerReference, client = createClient()) {
  if (env.nodeEnv === 'production' || env.stripeMode !== 'test') throw new HttpError(404, 'Confirmación de demostración no disponible');
  const paymentIntent = await client.paymentIntents.confirm(providerReference, {
    payment_method: 'pm_card_visa',
    return_url: 'http://localhost:4173',
  });
  return { providerReference: paymentIntent.id, providerStatus: paymentIntent.status };
}

function constructWebhookEvent(payload, signature, client = createClient()) {
  if (!env.stripeWebhookSecret) throw new HttpError(503, 'Falta STRIPE_WEBHOOK_SECRET');
  return client.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}

module.exports = { authorizePayment, capturePayment, cancelPayment, confirmTestPayment, constructWebhookEvent, toMinorUnits };
