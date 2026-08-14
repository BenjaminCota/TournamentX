const mysql = require('mysql2/promise');
const env = require('./env');

const databaseUrl = new URL(env.databaseUrl || 'mysql://root@localhost:3306/tournamentx');
const pool = mysql.createPool({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

function mysqlQuery(text, params = []) {
  const orderedParams = [];
  const sql = text
    .replace(/\$(\d+)/g, (_match, number) => {
      orderedParams.push(params[Number(number) - 1]);
      return '?';
    })
    .replace(/AS "([A-Za-z][A-Za-z0-9]*)"/g, 'AS `$1`');
  return { sql, orderedParams };
}

async function run(executor, text, params) {
  const { sql, orderedParams } = mysqlQuery(text, params);
  const [rows, fields] = await executor.execute(sql, orderedParams);
  return { rows, fields };
}

async function query(text, params) {
  return run(pool, text, params);
}

async function transaction(callback) {
  const connection = await pool.getConnection();
  const client = { query: (text, params) => run(connection, text, params) };
  try {
    await connection.beginTransaction();
    const result = await callback(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { pool, query, transaction };
