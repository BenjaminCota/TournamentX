const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { pool } = require('../src/config/database');

test('recorrido que consume el frontend Dev 8', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const connection = await pool.getConnection();
  const sponsorId = crypto.randomUUID();
  const poolId = crypto.randomUUID();
  const rewardId = crypto.randomUUID();
  const recipientId = crypto.randomUUID();
  const token = jwt.sign({ sub: crypto.randomUUID(), role: 'admin' }, env.jwtSecret);
  const auth = { Authorization: `Bearer ${token}` };
  let contributionId;
  try {
    await connection.execute('INSERT INTO sponsors (id, name, contact_email) VALUES (?,?,?)', [sponsorId, 'Flujo frontend', `${sponsorId}@test.local`]);
    await connection.execute('INSERT INTO prize_pools (id, tournament_id, name, currency, created_by) VALUES (?,?,?,?,?)', [poolId, crypto.randomUUID(), 'Bolsa flujo frontend', 'USD', crypto.randomUUID()]);

    const contribution = await request(app).post(`/api/prize-pools/${poolId}/contributions`).set(auth).send({ sponsorId, amount: 100, provider: 'binance_pay', idempotencyKey: `ui-${crypto.randomUUID()}` });
    assert.equal(contribution.status, 201);
    assert.match(contribution.body.payment.qrContent, /^binance:\/\/pay\?/);
    contributionId = contribution.body.data.id;

    const simulated = await request(app).post(`/api/contributions/${contributionId}/binance/simulate`).set(auth).send({ status: 'paid' });
    assert.equal(simulated.status, 200);
    assert.equal(simulated.body.webhookVerified, true);

    const distribution = await request(app).put(`/api/prize-pools/${poolId}/distribution`).set(auth).send({ rules: [{ position: 1, percentage: 100 }] });
    assert.equal(distribution.status, 200);
    assert.equal(Number(distribution.body.data[0].amount), 100);

    const payout = await request(app).post(`/api/prize-pools/${poolId}/payouts`).set(auth).send({ recipientId, position: 1, destination: `simulated:winner:${recipientId}` });
    assert.equal(payout.status, 201);
    const receipt = await request(app).get(`/api/receipts/${payout.body.data.receiptCode}`);
    assert.equal(receipt.status, 200);
    assert.equal(Number(receipt.body.data.amount), 100);

    const reward = await request(app).post('/api/rewards').set(auth).send({ sponsorId, prizePoolId: poolId, rewardType: 'coupon', name: 'Cupón de prueba', quantity: 2 });
    assert.equal(reward.status, 201);
    const rewards = await request(app).get(`/api/rewards?prizePoolId=${poolId}`).set(auth);
    assert.equal(rewards.status, 200);
    assert.equal(rewards.body.data.length, 1);
  } finally {
    await connection.execute('DELETE FROM reward_assignments WHERE reward_item_id = ?', [rewardId]);
    await connection.execute('DELETE FROM reward_items WHERE prize_pool_id = ?', [poolId]);
    await connection.execute('DELETE FROM payouts WHERE prize_pool_id = ?', [poolId]);
    await connection.execute('DELETE FROM tournament_winners WHERE result_import_id IN (SELECT id FROM tournament_result_imports WHERE prize_pool_id = ?)', [poolId]);
    await connection.execute('DELETE FROM tournament_result_imports WHERE prize_pool_id = ?', [poolId]);
    await connection.execute('DELETE FROM distribution_rules WHERE prize_pool_id = ?', [poolId]);
    if (contributionId) {
      await connection.execute('DELETE FROM payment_events WHERE contribution_id = ?', [contributionId]);
      await connection.execute('DELETE FROM payment_idempotency WHERE contribution_id = ?', [contributionId]);
      await connection.execute('DELETE FROM contributions WHERE id = ?', [contributionId]);
    }
    await connection.execute('DELETE FROM prize_pools WHERE id = ?', [poolId]);
    await connection.execute('DELETE FROM sponsors WHERE id = ?', [sponsorId]);
    connection.release();
    await pool.end();
  }
});
