const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');

const allowedTransitions = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  failed: [],
  refunded: [],
};

async function list(req, res, next) {
  try {
    const conditions = [];
    const params = [];
    if (req.query.prizePoolId) { params.push(req.query.prizePoolId); conditions.push(`c.prize_pool_id = $${params.length}`); }
    if (req.query.status) { params.push(req.query.status); conditions.push(`c.status = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT c.id, c.prize_pool_id AS "prizePoolId", c.sponsor_id AS "sponsorId", s.name AS "sponsorName",
       c.amount, c.currency, c.provider, c.provider_reference AS "providerReference", c.status,
       c.created_at AS "createdAt" FROM contributions c JOIN sponsors s ON s.id = c.sponsor_id
       ${where} ORDER BY c.created_at DESC`,
      params,
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function changeStatus(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { status, notes } = req.validated.body;
    const updated = await db.transaction(async (client) => {
      const result = await client.query(
        `SELECT c.*, pp.status AS pool_status FROM contributions c
         JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1 FOR UPDATE`,
        [id],
      );
      const contribution = result.rows[0];
      if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
      if (!allowedTransitions[contribution.status].includes(status)) {
        throw new HttpError(409, `No se puede cambiar un pago de ${contribution.status} a ${status}`);
      }
      if (status === 'refunded' && contribution.pool_status !== 'funding') {
        throw new HttpError(409, 'No se puede reembolsar una aportación después de bloquear la bolsa');
      }

      await client.query('UPDATE contributions SET status = $1 WHERE id = $2', [status, id]);
      if (contribution.status === 'pending' && status === 'paid') {
        await client.query('UPDATE prize_pools SET funded_amount = funded_amount + $1 WHERE id = $2', [contribution.amount, contribution.prize_pool_id]);
      }
      if (contribution.status === 'paid' && status === 'refunded') {
        await client.query('UPDATE prize_pools SET funded_amount = GREATEST(funded_amount - $1, 0) WHERE id = $2', [contribution.amount, contribution.prize_pool_id]);
      }
      const eventType = { paid: 'approved', failed: 'failed', refunded: 'refunded' }[status];
      await client.query(
        `INSERT INTO payment_events (id, contribution_id, event_type, previous_status, new_status, performed_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), id, eventType, contribution.status, status, req.user.sub, notes || null],
      );
      const finalResult = await client.query('SELECT * FROM contributions WHERE id = $1', [id]);
      return finalResult.rows[0];
    });
    res.json({ data: updated });
  } catch (error) { next(error); }
}

async function history(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT pe.id, pe.contribution_id AS "contributionId", pe.event_type AS "eventType",
       pe.previous_status AS "previousStatus", pe.new_status AS "newStatus", pe.performed_by AS "performedBy",
       pe.notes, pe.created_at AS "createdAt", c.amount, c.currency, c.provider
       FROM payment_events pe JOIN contributions c ON c.id = pe.contribution_id
       WHERE pe.contribution_id = $1 ORDER BY pe.created_at ASC`,
      [req.validated.params.id],
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

module.exports = { list, changeStatus, history };
