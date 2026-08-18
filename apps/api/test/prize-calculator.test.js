const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistribution } = require('../src/services/prize-calculator');
const paymentGateway = require('../src/services/payment-gateway');
const stripeGateway = require('../src/services/stripe-gateway');

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

test('rechaza proveedores distintos de Stripe', async () => {
  await assert.rejects(
    paymentGateway.createPayment({ provider: 'crypto', amount: 25, currency: 'USD', reference: 'test' }),
    /Proveedor de pago no soportado/,
  );
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
