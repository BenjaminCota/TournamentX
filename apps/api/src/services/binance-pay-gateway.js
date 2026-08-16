const crypto = require('node:crypto');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

function createSignature({ timestamp, nonce, body, secretKey }) {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  return crypto.createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();
}

function assertTestConfiguration() {
  if (!env.binancePayApiKey || !env.binancePaySecretKey) throw new HttpError(503, 'Faltan credenciales de Binance Pay');
  if (!env.binancePayBaseUrl) throw new HttpError(503, 'Falta BINANCE_PAY_BASE_URL del entorno de prueba');
  if (env.binancePayBaseUrl.includes('bpay.binanceapi.com') && !env.binancePayAllowProduction) {
    throw new HttpError(503, 'La URL de producción de Binance Pay está bloqueada para este proyecto');
  }
}

async function signedRequest(path, requestBody, request = fetch) {
  assertTestConfiguration();
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const body = JSON.stringify(requestBody);
  const signature = createSignature({ timestamp, nonce, body, secretKey: env.binancePaySecretKey });
  const response = await request(`${env.binancePayBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'BinancePay-Timestamp': timestamp,
      'BinancePay-Nonce': nonce,
      'BinancePay-Certificate-SN': env.binancePayApiKey,
      'BinancePay-Signature': signature
    },
    body
  });
  const result = await response.json();
  if (!response.ok || result.status === 'FAIL' || (result.code && result.code !== '000000')) {
    throw new HttpError(502, `Binance Pay rechazó la solicitud: ${result.code || response.status}`);
  }
  return result;
}

async function createOrder({ amount, currency, reference, request }) {
  const merchantTradeNo = String(reference).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  const result = await signedRequest('/binancepay/openapi/v3/order', {
    env: { terminalType: 'WEB' },
    merchantTradeNo,
    orderAmount: Number(amount),
    currency: currency.toUpperCase(),
    goods: {
      goodsType: '02',
      goodsCategory: 'Z000',
      referenceGoodsId: merchantTradeNo,
      goodsName: 'TournamentX prize pool contribution'
    }
  }, request);
  const data = result.data || {};
  return {
    providerReference: data.prepayId || merchantTradeNo,
    status: 'pending',
    checkoutUrl: data.checkoutUrl || data.deeplink || null,
    qrContent: data.qrcodeLink || data.qrContent || null,
    metadata: { simulated: false, environment: 'test', providerStatus: result.status || 'SUCCESS' }
  };
}

module.exports = { createOrder, createSignature, signedRequest };
