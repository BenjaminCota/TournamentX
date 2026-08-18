const crypto = require('node:crypto');
const env = require('../config/env');
const HttpError = require('../utils/http-error');
const stripeGateway = require('./stripe-gateway');

const SUPPORTED = ['stripe'];

async function createPayment({ provider, amount, currency, reference, idempotencyKey }) {
  if (!SUPPORTED.includes(provider)) throw new HttpError(400, 'Proveedor de pago no soportado');
  if (env.stripeMode === 'test') {
    return stripeGateway.authorizePayment({ amount, currency, reference, idempotencyKey });
  }
  if (!env.isTestRun) throw new HttpError(503, 'Stripe no está configurado para procesar pagos');

  const providerReference = `pi_test_${crypto.randomUUID()}`;
  return {
    providerReference,
    status: 'pending',
    checkoutUrl: `/api/payments/${providerReference}`,
    metadata: { simulated: true, reference, amount, currency, instructions: 'Confirma o rechaza el pago desde la API administrativa.' },
  };
}

module.exports = { createPayment, SUPPORTED };
