const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

async function session(_req, res, next) {
  try {
    if (env.nodeEnv === 'production') throw new HttpError(404, 'Demostración no disponible');
    let sponsor = (await db.query("SELECT * FROM sponsors WHERE contact_email = 'demo@tournamentx.local' LIMIT 1")).rows[0];
    if (!sponsor) {
      const id = crypto.randomUUID();
      await db.query('INSERT INTO sponsors (id, name, contact_email) VALUES ($1,$2,$3)', [id, 'Patrocinador Demo', 'demo@tournamentx.local']);
      sponsor = (await db.query('SELECT * FROM sponsors WHERE id = $1', [id])).rows[0];
    }
    let prizePool = (await db.query("SELECT * FROM prize_pools WHERE name = 'Bolsa Demo Módulo 8' AND status = 'funding' LIMIT 1")).rows[0];
    if (!prizePool) {
      const id = crypto.randomUUID();
      await db.query(
        'INSERT INTO prize_pools (id, tournament_id, name, currency, target_amount, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, crypto.randomUUID(), 'Bolsa Demo Módulo 8', 'USD', 10000, crypto.randomUUID()],
      );
      prizePool = (await db.query('SELECT * FROM prize_pools WHERE id = $1', [id])).rows[0];
    }
    const token = jwt.sign({ sub: 'dev8-demo', role: 'admin', demo: true }, env.jwtSecret, { expiresIn: '8h' });
    const stripePublishableKey = env.stripeMode === 'test' && env.stripePublishableKey?.startsWith('pk_test_') ? env.stripePublishableKey : null;
    res.json({ token, stripePublishableKey, sponsor: { id: sponsor.id, name: sponsor.name }, prizePool: { id: prizePool.id, name: prizePool.name, fundedAmount: prizePool.funded_amount } });
  } catch (error) { next(error); }
}

module.exports = { session };
