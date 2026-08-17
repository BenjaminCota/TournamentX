const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('../config/database');
const { migrateTeamRoster } = require('./migrate-team-roster');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  await migrateTeamRoster();
  console.log('Base de datos inicializada correctamente.');
  await pool.end();
}

main().catch(async (error) => {
  console.error('No fue posible inicializar la base de datos:', error.message);
  await pool.end();
  process.exitCode = 1;
});
