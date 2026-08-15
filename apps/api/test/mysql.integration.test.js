const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pool } = require('../src/config/database');

test('valida el flujo financiero y de recompensas en MySQL', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const connection = await pool.getConnection();
  const sponsorId = crypto.randomUUID();
  const poolId = crypto.randomUUID();
  const contributionId = crypto.randomUUID();
  const rewardId = crypto.randomUUID();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO sponsors (id, name, contact_email) VALUES (?,?,?)', [sponsorId, 'Patrocinador de prueba', `${sponsorId}@test.local`]);
    await connection.execute(
      'INSERT INTO prize_pools (id, tournament_id, name, currency, created_by) VALUES (?,?,?,?,?)',
      [poolId, crypto.randomUUID(), 'Bolsa de prueba', 'MXN', crypto.randomUUID()],
    );
    await connection.execute(
      `INSERT INTO contributions (id, prize_pool_id, sponsor_id, amount, currency, provider, provider_reference, status, metadata)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [contributionId, poolId, sponsorId, 500, 'MXN', 'stripe', `pi_test_${crypto.randomUUID()}`, 'pending', '{}'],
    );
    await connection.execute(
      `INSERT INTO reward_items (id, sponsor_id, prize_pool_id, reward_type, name, quantity, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [rewardId, sponsorId, poolId, 'coupon', 'Cupón de prueba', 2, crypto.randomUUID()],
    );
    const [rows] = await connection.execute(
      `SELECT c.status, r.reward_type FROM contributions c JOIN reward_items r ON r.prize_pool_id = c.prize_pool_id WHERE c.id = ?`,
      [contributionId],
    );
    assert.equal(rows[0].status, 'pending');
    assert.equal(rows[0].reward_type, 'coupon');
  } finally {
    await connection.rollback();
    connection.release();
    await pool.end();
  }
});
