const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistribution } = require('../src/services/prize-calculator');
const paymentGateway = require('../src/services/payment-gateway');

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
