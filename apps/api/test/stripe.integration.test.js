const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Stripe = require('stripe');
const env = require('../src/config/env');
const { pool } = require('../src/config/database');

const enabled = process.env.RUN_STRIPE_TESTS === '1';

async function waitForStatus(connection, contributionId, expected, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [rows] = await connection.execute('SELECT status FROM contributions WHERE id = ?', [contributionId]);
    if (rows[0]?.status === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const [rows] = await connection.execute('SELECT status FROM contributions WHERE id = ?', [contributionId]);
  assert.equal(rows[0]?.status, expected, `El webhook no cambió la aportación a ${expected}`);
}

test('procesa autorización, captura y cancelación reales de Stripe Test', { skip: !enabled, timeout: 30000 }, async () => {
  assert.match(env.stripeSecretKey || '', /^sk_test_/, 'La prueba exige una clave Stripe Test');
  assert.equal(env.stripeMode, 'test');
  assert.ok(env.stripeWebhookSecret, 'La prueba exige el listener y STRIPE_WEBHOOK_SECRET');

  const stripe = new Stripe(env.stripeSecretKey);
  const connection = await pool.getConnection();
  const sponsorId = crypto.randomUUID();
  const prizePoolId = crypto.randomUUID();
  const captureContributionId = crypto.randomUUID();
  const cancelContributionId = crypto.randomUUID();
  const paymentIntents = [];

  try {
    await connection.execute('INSERT INTO sponsors (id, name, contact_email) VALUES (?,?,?)', [
      sponsorId,
      'Stripe Test temporal',
      `${sponsorId}@stripe-test.local`,
    ]);
    await connection.execute(
      'INSERT INTO prize_pools (id, tournament_id, name, currency, created_by) VALUES (?,?,?,?,?)',
      [prizePoolId, crypto.randomUUID(), 'Bolsa Stripe Test temporal', 'USD', crypto.randomUUID()],
    );

    for (const contributionId of [captureContributionId, cancelContributionId]) {
      const intent = await stripe.paymentIntents.create({
        amount: 1234,
        currency: 'usd',
        capture_method: 'manual',
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        payment_method: 'pm_card_visa',
        metadata: { tournamentxReference: contributionId, integrationTest: 'true' },
      });
      paymentIntents.push(intent.id);
      await connection.execute(
        `INSERT INTO contributions
         (id, prize_pool_id, sponsor_id, amount, currency, provider, provider_reference, status, metadata)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [contributionId, prizePoolId, sponsorId, 12.34, 'USD', 'stripe', intent.id, 'pending', JSON.stringify({ integrationTest: true })],
      );
      await stripe.paymentIntents.confirm(intent.id);
      await waitForStatus(connection, contributionId, 'authorized');
    }

    await stripe.paymentIntents.capture(paymentIntents[0]);
    await waitForStatus(connection, captureContributionId, 'paid');

    await stripe.paymentIntents.cancel(paymentIntents[1]);
    await waitForStatus(connection, cancelContributionId, 'cancelled');

    const [poolRows] = await connection.execute('SELECT funded_amount FROM prize_pools WHERE id = ?', [prizePoolId]);
    assert.equal(Number(poolRows[0].funded_amount), 12.34);
  } finally {
    for (const paymentIntentId of paymentIntents) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status === 'requires_capture') await stripe.paymentIntents.cancel(paymentIntentId);
      } catch {}
    }
    await connection.execute(
      'DELETE FROM payment_events WHERE contribution_id IN (?,?)',
      [captureContributionId, cancelContributionId],
    );
    await connection.execute(
      'DELETE FROM contributions WHERE id IN (?,?)',
      [captureContributionId, cancelContributionId],
    );
    await connection.execute('DELETE FROM prize_pools WHERE id = ?', [prizePoolId]);
    await connection.execute('DELETE FROM sponsors WHERE id = ?', [sponsorId]);
    connection.release();
    await pool.end();
  }
});
