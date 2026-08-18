const db = require('../config/database');
const env = require('../config/env');

const SPONSOR_ID = 'b3f6c910-bc62-4f8d-89d9-9e8712fbdf01';
const PRIZE_POOL_ID = 'cb79de4a-b038-4c93-8546-a5351876f802';
const TOURNAMENT_ID = 'f371c37c-3ba4-4840-954b-978d2f9225da';

async function removeCurrentRewardsData(client) {
  await client.query('DELETE FROM reward_assignments');
  await client.query('DELETE FROM reward_items');
  await client.query('DELETE FROM payout_events');
  await client.query('DELETE FROM payouts');
  await client.query('DELETE FROM tournament_winners');
  await client.query('DELETE FROM tournament_result_imports');
  await client.query('DELETE FROM distribution_rules');
  await client.query('DELETE FROM payment_idempotency');
  await client.query('DELETE FROM payment_events');
  await client.query('DELETE FROM contributions');
  await client.query('DELETE FROM prize_pools');
  await client.query('DELETE FROM sponsors');
}

async function insertCoherentData(client) {
  await client.query(
    `INSERT INTO sponsors (id, name, contact_email, active)
     VALUES ($1, $2, $3, TRUE)
     ON DUPLICATE KEY UPDATE name = VALUES(name), contact_email = VALUES(contact_email), active = TRUE`,
    [SPONSOR_ID, 'TournamentX Labs', 'sponsor@tournamentx.local'],
  );
  await client.query(
    `INSERT INTO prize_pools
      (id, tournament_id, name, currency, target_amount, funded_amount, status, created_by)
     VALUES ($1, $2, $3, 'USD', 1000, 0, 'funding', 'user-admin')
     ON DUPLICATE KEY UPDATE tournament_id = VALUES(tournament_id), name = VALUES(name),
       currency = VALUES(currency), target_amount = VALUES(target_amount), created_by = VALUES(created_by)`,
    [PRIZE_POOL_ID, TOURNAMENT_ID, 'Bolsa Community Cup'],
  );
  await client.query(
    `INSERT INTO platform_payment_settings (id, platform_fee_percentage, updated_by)
     VALUES ('platform', 5, 'user-admin')
     ON DUPLICATE KEY UPDATE platform_fee_percentage = VALUES(platform_fee_percentage), updated_by = VALUES(updated_by)`,
  );
}

async function seedDev8Data({ reset = false } = {}) {
  if (!env.databaseUrl) throw new Error('DATABASE_URL es obligatoria para preparar los datos de Dev 8');
  if (reset && env.nodeEnv === 'production') throw new Error('El reinicio de datos no está permitido en producción');

  await db.transaction(async (client) => {
    if (reset) await removeCurrentRewardsData(client);
    await insertCoherentData(client);
  });
  await db.query("ALTER TABLE contributions MODIFY COLUMN provider ENUM('stripe') NOT NULL");
}

if (require.main === module) {
  seedDev8Data({ reset: process.argv.includes('--reset') })
    .then(() => console.log('Datos de premios preparados correctamente.'))
    .catch((error) => { console.error('No fue posible preparar los datos de premios:', error.message); process.exitCode = 1; })
    .finally(() => db.pool.end());
}

module.exports = { seedDev8Data, SPONSOR_ID, PRIZE_POOL_ID, TOURNAMENT_ID };
