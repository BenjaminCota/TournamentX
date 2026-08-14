const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('../config/database');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Base de datos inicializada correctamente.');
  await pool.end();
}

main().catch(async (error) => {
  console.error('No fue posible inicializar la base de datos:', error.message);
  await pool.end();
  process.exitCode = 1;
});
