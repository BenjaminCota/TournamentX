const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistribution } = require('../src/services/prize-calculator');
const paymentGateway = require('../src/services/payment-gateway');
const stripeGateway = require('../src/services/stripe-gateway');
const binancePayGateway = require('../src/services/binance-pay-gateway');
const binanceSimulator = require('../src/services/binance-pay-simulator');

test('distribuye una bolsa sin perder centavos', () => {
  const result = calculateDistribution(1000, [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ]);
  assert.deepEqual(result.map((item) => item.amount), [500, 300, 200]);
});

test('ajusta el redondeo en la última posición', () => {
  const result = calculateDistribution(100, [
    { position: 1, percentage: 33.33 },
    { position: 2, percentage: 33.33 },
    { position: 3, percentage: 33.34 },
  ]);
  assert.equal(result.reduce((sum, item) => sum + item.amount, 0), 100);
});

test('rechaza porcentajes que no suman cien', () => {
  assert.throws(() => calculateDistribution(100, [{ position: 1, percentage: 80 }]), /sumar 100/);
});

test('crea pagos de Stripe pendientes y simulados', async () => {
  const payment = await paymentGateway.createPayment({ provider: 'stripe', amount: 250, currency: 'MXN', reference: 'test' });
  assert.equal(payment.status, 'pending');
  assert.equal(payment.metadata.simulated, true);
  assert.match(payment.providerReference, /^pi_test_/);
});

test('crea pagos de Binance Pay pendientes y simulados', async () => {
  const payment = await paymentGateway.createPayment({ provider: 'binance_pay', amount: 25, currency: 'USDT', reference: 'test' });
  assert.equal(payment.status, 'pending');
  assert.match(payment.providerReference, /^bp_test_/);
});

test('convierte importes de Stripe a la unidad menor de la moneda', () => {
  assert.equal(stripeGateway.toMinorUnits(250.75, 'MXN'), 25075);
  assert.equal(stripeGateway.toMinorUnits(500, 'JPY'), 500);
});

test('crea una autorización Stripe Test con captura manual', async () => {
  const calls = [];
  const client = {
    paymentIntents: {
      create: async (payload, options) => {
        calls.push({ payload, options });
        return {
          id: 'pi_test_manual_capture',
          client_secret: 'pi_test_manual_capture_secret',
          capture_method: 'manual',
          status: 'requires_payment_method',
          amount: 12550,
          currency: 'mxn'
        };
      }
    }
  };

  const payment = await stripeGateway.authorizePayment({ amount: 125.5, currency: 'MXN', reference: 'pool-1', idempotencyKey: 'idem-12345678', client });
  assert.equal(payment.providerReference, 'pi_test_manual_capture');
  assert.equal(payment.metadata.captureMethod, 'manual');
  assert.equal(payment.metadata.simulated, false);
  assert.equal(calls[0].payload.amount, 12550);
  assert.equal(calls[0].payload.capture_method, 'manual');
  assert.equal(calls[0].options.idempotencyKey, 'idem-12345678');
});

test('captura y cancela PaymentIntents de Stripe mediante el adaptador', async () => {
  const calls = [];
  const client = {
    paymentIntents: {
      capture: async (id) => { calls.push(['capture', id]); return { id, status: 'succeeded' }; },
      cancel: async (id) => { calls.push(['cancel', id]); return { id, status: 'canceled' }; }
    }
  };
  const captured = await stripeGateway.capturePayment('pi_capture_test', client);
  const cancelled = await stripeGateway.cancelPayment('pi_cancel_test', client);
  assert.equal(captured.providerStatus, 'succeeded');
  assert.equal(cancelled.providerStatus, 'canceled');
  assert.deepEqual(calls, [['capture', 'pi_capture_test'], ['cancel', 'pi_cancel_test']]);
});

test('firma Binance Pay con HMAC SHA-512 de forma determinista', () => {
  const signature = binancePayGateway.createSignature({ timestamp: '1700000000000', nonce: 'abc123', body: '{"amount":10}', secretKey: 'test-secret' });
  assert.equal(signature, '7E0341B2C9337FA8C24AC20A2B0CB3FB4C0C10DA0D291139793B579B139E00E7A63E83BF2B5A50FA257D2A5C003195E7F9E91AFA0151D7463F5833F5A2C20B36');
});

test('firma y verifica webhooks RSA-SHA256 del simulador Binance Pay', () => {
  const notification = binanceSimulator.signNotification({ bizType: 'PAY', bizStatus: 'PAY_SUCCESS' }, '1611232922428', 'AbCdEfGhIjKlMnOpQrStUvWxYz123456');
  assert.equal(binanceSimulator.verifyNotification(notification.rawBody, notification.headers), true);
  assert.equal(binanceSimulator.verifyNotification(`${notification.rawBody} `, notification.headers), false);
});

test('crea una orden C2B local con QR y referencia única', () => {
  const order = binanceSimulator.createOrder({ reference: 'pool-1', amount: 25, currency: 'USD' });
  assert.match(order.providerReference, /^bp_test_/);
  assert.match(order.qrContent, /^binance:\/\/pay\?/);
  assert.equal(order.metadata.simulated, true);
});
