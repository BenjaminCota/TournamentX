const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pool } = require('../src/config/database');

test('MySQL conserva historial de roster y rechaza duplicados activos', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const connection = await pool.getConnection();
  const teamId = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO teams (id, name, abbreviation, sport, region, competition_type, status)
       VALUES (?,?,?,?,?,?,?)`,
      [teamId, 'Equipo de integración', `T${teamId.slice(0, 6)}`, 'Valorant', 'LATAM', 'Pruebas', 'active'],
    );
    await connection.execute(
      `INSERT INTO players (id, name, lastname, nickname, sport, position_name, nationality, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [playerId, 'Jugador', 'Integración', `player-${playerId.slice(0, 8)}`, 'Valorant', 'Support', 'MX', 'active'],
    );
    await connection.execute(
      `INSERT INTO team_roster (id, team_id, player_id, role_name, status) VALUES (?,?,?,?,?)`,
      [crypto.randomUUID(), teamId, playerId, 'Titular', 'active'],
    );
    await assert.rejects(
      connection.execute(
        `INSERT INTO team_roster (id, team_id, player_id, role_name, status) VALUES (?,?,?,?,?)`,
        [crypto.randomUUID(), teamId, playerId, 'Duplicado', 'active'],
      ),
      (error) => error.code === 'ER_DUP_ENTRY',
    );
    await connection.execute(
      `INSERT INTO team_roster (id, team_id, player_id, role_name, status) VALUES (?,?,?,?,?)`,
      [crypto.randomUUID(), teamId, playerId, 'Historial', 'inactive'],
    );
  } finally {
    await connection.rollback();
    connection.release();
    await pool.end();
  }
});
