const { pool } = require('../config/database');

async function migrateTeamRoster() {
  const [columns] = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'team_roster' AND column_name = 'active_member'`,
  );
  if (columns.length === 0) {
    await pool.query(
      `ALTER TABLE team_roster
       ADD COLUMN active_member TINYINT UNSIGNED
       GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED`,
    );
  }

  const [duplicates] = await pool.query(
    `SELECT team_id, player_id, COUNT(*) AS total
     FROM team_roster
     WHERE status = 'active'
     GROUP BY team_id, player_id
     HAVING COUNT(*) > 1
     LIMIT 5`,
  );
  if (duplicates.length > 0) {
    throw new Error(`Existen membresías activas duplicadas; ciérralas antes de migrar: ${duplicates.map((row) => `${row.team_id}/${row.player_id}`).join(', ')}`);
  }

  const [indexes] = await pool.query(
    `SELECT index_name FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'team_roster' AND index_name = 'uq_team_roster_active_member'`,
  );
  if (indexes.length === 0) {
    await pool.query('ALTER TABLE team_roster ADD UNIQUE KEY uq_team_roster_active_member (team_id, player_id, active_member)');
  }
}

async function main() {
  try {
    await migrateTeamRoster();
    console.log('Migración de roster aplicada correctamente.');
  } catch (error) {
    console.error('No fue posible migrar team_roster:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { migrateTeamRoster };
