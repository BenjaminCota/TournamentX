const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const paymentGateway = require('../services/payment-gateway');
const { calculateDistribution } = require('../services/prize-calculator');

const poolSelect = `SELECT id, tournament_id AS "tournamentId", name, currency,
  target_amount AS "targetAmount", funded_amount AS "fundedAmount", status,
  created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt" FROM prize_pools`;

async function list(req, res, next) {
  try {
    const params = [];
    let where = '';
    if (req.query.tournamentId) { params.push(req.query.tournamentId); where = ' WHERE tournament_id = $1'; }
    const { rows } = await db.query(`${poolSelect}${where} ORDER BY created_at DESC`, params);
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const { tournamentId, name, currency, targetAmount } = req.validated.body;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO prize_pools (id, tournament_id, name, currency, target_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, tournamentId, name, currency, targetAmount || null, req.user.sub],
    );
    const { rows } = await db.query(`${poolSelect} WHERE id = $1`, [id]);
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query(`${poolSelect} WHERE id = $1`, [req.validated.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Bolsa de premios no encontrada');
    const contributions = await db.query(
      `SELECT c.id, c.sponsor_id AS "sponsorId", s.name AS "sponsorName", c.amount,
       c.currency, c.provider, c.status, c.created_at AS "createdAt"
       FROM contributions c JOIN sponsors s ON s.id = c.sponsor_id WHERE c.prize_pool_id = $1 ORDER BY c.created_at DESC`,
      [req.validated.params.id],
    );
    const distributionRules = await db.query(
      'SELECT position, percentage, amount FROM distribution_rules WHERE prize_pool_id = $1 ORDER BY position',
      [req.validated.params.id],
    );
    const payouts = await db.query(
      `SELECT id, recipient_id AS "recipientId", position, amount, currency, destination, status,
       receipt_code AS "receiptCode", released_at AS "releasedAt" FROM payouts WHERE prize_pool_id = $1 ORDER BY position`,
      [req.validated.params.id],
    );
    const winners = await db.query(
      `SELECT tw.recipient_id AS "recipientId", tw.recipient_type AS "recipientType", tw.position
       FROM tournament_winners tw JOIN tournament_result_imports tri ON tri.id = tw.result_import_id
       WHERE tri.prize_pool_id = $1 ORDER BY tw.position`,
      [req.validated.params.id],
    );
    res.json({ data: { ...rows[0], contributions: contributions.rows, distributionRules: distributionRules.rows, payouts: payouts.rows, winners: winners.rows } });
  } catch (error) { next(error); }
}

async function contribute(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const { sponsorId, amount, provider, idempotencyKey } = req.validated.body;
    const poolResult = await db.query('SELECT * FROM prize_pools WHERE id = $1', [poolId]);
    const prizePool = poolResult.rows[0];
    if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
    if (prizePool.status !== 'funding') throw new HttpError(409, 'La bolsa no acepta más aportaciones');
    const sponsor = await db.query('SELECT id FROM sponsors WHERE id = $1 AND active = TRUE', [sponsorId]);
    if (!sponsor.rows[0]) throw new HttpError(404, 'Patrocinador no encontrado o inactivo');

    if (idempotencyKey) {
      const previous = await db.query(
        `SELECT c.* FROM payment_idempotency i JOIN contributions c ON c.id = i.contribution_id
         WHERE i.idempotency_key = $1`,
        [idempotencyKey],
      );
      if (previous.rows[0]) return res.json({ data: previous.rows[0], reused: true });
    }

    const payment = await paymentGateway.createPayment({ provider, amount, currency: prizePool.currency, reference: poolId, idempotencyKey });
    const contribution = await db.transaction(async (client) => {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO contributions (id, prize_pool_id, sponsor_id, amount, currency, provider, provider_reference, status, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, poolId, sponsorId, amount, prizePool.currency, provider, payment.providerReference, payment.status, JSON.stringify(payment.metadata)],
      );
      if (idempotencyKey) await client.query('INSERT INTO payment_idempotency (idempotency_key, contribution_id) VALUES ($1,$2)', [idempotencyKey, id]);
      if (payment.status === 'paid') await client.query('UPDATE prize_pools SET funded_amount = funded_amount + $1, updated_at = NOW() WHERE id = $2', [amount, poolId]);
      const { rows } = await client.query('SELECT * FROM contributions WHERE id = $1', [id]);
      await client.query(
        `INSERT INTO payment_events (id, contribution_id, event_type, previous_status, new_status, performed_by, notes)
         VALUES ($1,$2,'created',NULL,'pending',$3,$4)`,
        [crypto.randomUUID(), id, req.user.sub, `Orden simulada creada con ${provider}`],
      );
      return rows[0];
    });
    res.status(201).json({ data: contribution, payment: { checkoutUrl: payment.checkoutUrl, clientSecret: payment.clientSecret, qrContent: payment.qrContent, simulated: payment.metadata.simulated } });
  } catch (error) { next(error); }
}

async function defineDistribution(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const result = await db.query('SELECT funded_amount FROM prize_pools WHERE id = $1', [poolId]);
    if (!result.rows[0]) throw new HttpError(404, 'Bolsa de premios no encontrada');
    const calculated = calculateDistribution(result.rows[0].funded_amount, req.validated.body.rules);
    await db.transaction(async (client) => {
      await client.query('DELETE FROM distribution_rules WHERE prize_pool_id = $1', [poolId]);
      for (const rule of calculated) {
        await client.query('INSERT INTO distribution_rules (id, prize_pool_id, position, percentage, amount) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), poolId, rule.position, rule.percentage, rule.amount]);
      }
      await client.query("UPDATE prize_pools SET status = 'locked', updated_at = NOW() WHERE id = $1", [poolId]);
    });
    res.json({ data: calculated });
  } catch (error) { next(error); }
}

async function releasePayout(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const { recipientId, position, destination } = req.validated.body;
    const ruleResult = await db.query(
      `SELECT dr.amount, pp.currency, pp.status FROM distribution_rules dr
       JOIN prize_pools pp ON pp.id = dr.prize_pool_id WHERE dr.prize_pool_id = $1 AND dr.position = $2`,
      [poolId, position],
    );
    const rule = ruleResult.rows[0];
    if (!rule) throw new HttpError(404, 'No existe una regla para esa posición');
    if (!['locked', 'distributed'].includes(rule.status)) throw new HttpError(409, 'La distribución aún no está bloqueada');
    const receiptCode = `TX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payoutId = crypto.randomUUID();
    await db.query(
      `INSERT INTO payouts (id, prize_pool_id, recipient_id, position, amount, currency, destination, receipt_code, released_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [payoutId, poolId, recipientId, position, rule.amount, rule.currency, destination, receiptCode, req.user.sub],
    );
    const { rows } = await db.query('SELECT id, recipient_id AS "recipientId", position, amount, currency, status, receipt_code AS "receiptCode", released_at AS "releasedAt" FROM payouts WHERE id = $1', [payoutId]);
    const pending = await db.query('SELECT COUNT(*) AS count FROM distribution_rules dr LEFT JOIN payouts p ON p.prize_pool_id = dr.prize_pool_id AND p.position = dr.position WHERE dr.prize_pool_id = $1 AND p.id IS NULL', [poolId]);
    if (pending.rows[0].count === 0) await db.query("UPDATE prize_pools SET status = 'distributed', updated_at = NOW() WHERE id = $1", [poolId]);
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

async function cancel(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM prize_pools WHERE id = $1', [req.validated.params.id]);
    const prizePool = rows[0];
    if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
    if (!['draft', 'funding'].includes(prizePool.status)) throw new HttpError(409, 'La bolsa ya no puede cancelarse');
    if (Number(prizePool.funded_amount) > 0) throw new HttpError(409, 'Reembolsa primero todas las aportaciones pagadas');
    await db.query("UPDATE prize_pools SET status = 'cancelled' WHERE id = $1", [prizePool.id]);
    const updated = await db.query(`${poolSelect} WHERE id = $1`, [prizePool.id]);
    res.json({ data: updated.rows[0] });
  } catch (error) { next(error); }
}

module.exports = { list, create, getById, contribute, defineDistribution, releasePayout, cancel };
