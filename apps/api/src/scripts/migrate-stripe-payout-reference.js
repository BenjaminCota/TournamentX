const { pool } = require('../config/database');

async function hasColumn(executor, table, column) {
  const [columns] = await executor.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return columns.length > 0;
}

async function addColumn(executor, table, column, definition) {
  if (!(await hasColumn(executor, table, column))) {
    await executor.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function migrateStripePayoutReference(executor = pool) {
  await addColumn(executor, 'payouts', 'provider_reference', 'VARCHAR(255) NULL UNIQUE AFTER destination');
  await addColumn(executor, 'payouts', 'platform_fee_percentage', 'DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER amount');
  await addColumn(executor, 'payouts', 'platform_fee_amount', 'DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER platform_fee_percentage');
  await addColumn(executor, 'payouts', 'net_amount', 'DECIMAL(14,2) NULL AFTER platform_fee_amount');
  await executor.query('UPDATE payouts SET net_amount = amount - platform_fee_amount WHERE net_amount IS NULL');
  await addColumn(executor, 'payouts', 'attempt_count', 'INT NOT NULL DEFAULT 0 AFTER status');
  await addColumn(executor, 'payouts', 'last_error', 'VARCHAR(255) NULL AFTER attempt_count');
  await executor.query('ALTER TABLE payouts MODIFY COLUMN released_at TIMESTAMP NULL DEFAULT NULL');
  await addColumn(executor, 'contributions', 'provider_refund_reference', 'VARCHAR(255) NULL UNIQUE AFTER provider_reference');
  await addColumn(executor, 'contributions', 'refunded_at', 'TIMESTAMP NULL AFTER metadata');

  await executor.query(
    `CREATE TABLE IF NOT EXISTS platform_payment_settings (
      id VARCHAR(30) PRIMARY KEY,
      platform_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 5,
      updated_by CHAR(36) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
  );
  await executor.query("INSERT IGNORE INTO platform_payment_settings (id, platform_fee_percentage) VALUES ('platform', 5)");
  await executor.query(
    `CREATE TABLE IF NOT EXISTS payout_events (
      id CHAR(36) PRIMARY KEY,
      payout_id CHAR(36) NOT NULL,
      event_type ENUM('created', 'retried', 'released', 'failed') NOT NULL,
      message VARCHAR(255) NULL,
      performed_by CHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payout_event_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
      INDEX idx_payout_events_payout (payout_id),
      INDEX idx_payout_events_created (created_at)
    ) ENGINE=InnoDB`,
  );
}

if (require.main === module) {
  migrateStripePayoutReference()
    .then(() => console.log('Estructura financiera de Stripe actualizada correctamente.'))
    .catch((error) => { console.error('No fue posible actualizar payouts:', error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { migrateStripePayoutReference };
