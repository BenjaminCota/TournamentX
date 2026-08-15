const crypto = require('node:crypto');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

const SUPPORTED = ['stripe', 'binance_pay'];

async function createPayment({ provider, amount, currency, reference }) {
  if (!SUPPORTED.includes(provider)) throw new HttpError(400, 'Proveedor de pago no soportado');
  if (env.paymentsMode !== 'simulated') {
    throw new HttpError(501, 'La conexión real todavía no está configurada; usa PAYMENTS_MODE=simulated');
  }

  const providerReference = `${provider === 'stripe' ? 'pi_test' : 'bp_test'}_${crypto.randomUUID()}`;
  return {
    providerReference,
    status: 'pending',
    checkoutUrl: `/api/payments/${providerReference}`,
    metadata: { simulated: true, reference, amount, currency, instructions: 'Confirma o rechaza el pago desde la API administrativa.' },
  };
}

module.exports = { createPayment, SUPPORTED };
