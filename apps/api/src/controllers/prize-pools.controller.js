const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const paymentGateway = require('../services/payment-gateway');
const { calculateDistribution } = require('../services/prize-calculator');
const { assertOrganizerOwnership, isOrganizer } = require('../utils/resource-ownership');
const tournamentStore = require('../modules/tournaments/tournament-store');
const stripeConnectService = require('../modules/stripe-connect/stripe-connect.service');
const paymentSettingsService = require('../modules/payments/payment-settings.service');
const env = require('../config/env');

const poolSelect = `SELECT id, tournament_id AS "tournamentId", name, currency,
  target_amount AS "targetAmount", funded_amount AS "fundedAmount", status,
  created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt" FROM prize_pools`;
const publicPoolSelect = `SELECT id, tournament_id AS "tournamentId", name, currency,
  target_amount AS "targetAmount", funded_amount AS "fundedAmount", status,
  updated_at AS "updatedAt" FROM prize_pools`;

async function listPublic(_req, res, next) {
  try {
    const { rows } = await db.query(`${publicPoolSelect} ORDER BY updated_at DESC`);
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function list(req, res, next) {
  try {
    const params = [];
    const conditions = [];
    if (req.query.tournamentId) { params.push(req.query.tournamentId); conditions.push(`tournament_id = $${params.length}`); }
    if (isOrganizer(req)) { params.push(req.user.sub); conditions.push(`created_by = $${params.length}`); }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(`${poolSelect}${where} ORDER BY created_at DESC`, params);
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const { tournamentId, name, currency, targetAmount } = req.validated.body;
    if (isOrganizer(req) && !tournamentStore.canUserManageTournament(tournamentId, req.user.sub)) {
      throw new HttpError(403, 'Solo puedes crear bolsas para tus propios torneos');
    }
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
    if (isOrganizer(req)) assertOrganizerOwnership(req, rows[0].createdBy, 'Solo puedes consultar la información financiera de tus propios torneos');
    const distributionRules = await db.query(
      'SELECT position, percentage, amount FROM distribution_rules WHERE prize_pool_id = $1 ORDER BY position',
      [req.validated.params.id],
    );
    if (!['admin', 'organizer'].includes(String(req.user.role || '').toLowerCase())) {
      const { createdBy: _createdBy, ...summary } = rows[0];
      return res.json({ data: { ...summary, distributionRules: distributionRules.rows, contributions: [], payouts: [], winners: [] } });
    }
    const contributions = await db.query(
      `SELECT c.id, c.sponsor_id AS "sponsorId", s.name AS "sponsorName", c.amount,
       c.currency, c.provider, c.provider_reference AS "providerReference",
       c.provider_refund_reference AS "providerRefundReference", c.status,
       c.refunded_at AS "refundedAt", c.created_at AS "createdAt"
       FROM contributions c JOIN sponsors s ON s.id = c.sponsor_id
       WHERE c.prize_pool_id = $1 ORDER BY c.created_at DESC`,
      [req.validated.params.id],
    );
    const payouts = await db.query(
      `SELECT id, recipient_id AS "recipientId", position, amount, currency, destination,
       platform_fee_percentage AS "platformFeePercentage", platform_fee_amount AS "platformFeeAmount",
       net_amount AS "netAmount", provider_reference AS "providerReference", status,
       attempt_count AS "attemptCount", last_error AS "lastError",
       receipt_code AS "receiptCode", released_at AS "releasedAt"
       FROM payouts WHERE prize_pool_id = $1 ORDER BY position`,
      [req.validated.params.id],
    );
    const winners = await db.query(
      `SELECT tw.recipient_id AS "recipientId", tw.recipient_type AS "recipientType", tw.position
       FROM tournament_winners tw JOIN tournament_result_imports tri ON tri.id = tw.result_import_id
       WHERE tri.prize_pool_id = $1 ORDER BY tw.position`,
      [req.validated.params.id],
    );
    return res.json({ data: { ...rows[0], contributions: contributions.rows, distributionRules: distributionRules.rows, payouts: payouts.rows, winners: winners.rows } });
  } catch (error) { return next(error); }
}

async function contribute(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const { sponsorId, amount, provider, idempotencyKey } = req.validated.body;
    const poolResult = await db.query('SELECT * FROM prize_pools WHERE id = $1', [poolId]);
    const prizePool = poolResult.rows[0];
    if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
    assertOrganizerOwnership(req, prizePool.created_by);
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
      const { rows: createdRows } = await client.query('SELECT * FROM contributions WHERE id = $1', [id]);
      await client.query(
        `INSERT INTO payment_events (id, contribution_id, event_type, previous_status, new_status, performed_by, notes)
         VALUES ($1,$2,'created',NULL,'pending',$3,$4)`,
        [crypto.randomUUID(), id, req.user.sub, 'Aportación creada con Stripe'],
      );
      return createdRows[0];
    });
    return res.status(201).json({ data: contribution, payment: { checkoutUrl: payment.checkoutUrl, clientSecret: payment.clientSecret, simulated: payment.metadata.simulated } });
  } catch (error) { return next(error); }
}

async function defineDistribution(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const result = await db.query('SELECT funded_amount, created_by FROM prize_pools WHERE id = $1', [poolId]);
    if (!result.rows[0]) throw new HttpError(404, 'Bolsa de premios no encontrada');
    assertOrganizerOwnership(req, result.rows[0].created_by);
    const calculated = calculateDistribution(result.rows[0].funded_amount, req.validated.body.rules);
    await db.transaction(async (client) => {
      await client.query('DELETE FROM distribution_rules WHERE prize_pool_id = $1', [poolId]);
      for (const rule of calculated) {
        await client.query('INSERT INTO distribution_rules (id, prize_pool_id, position, percentage, amount) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), poolId, rule.position, rule.percentage, rule.amount]);
      }
      await client.query("UPDATE prize_pools SET status = 'locked', updated_at = NOW() WHERE id = $1", [poolId]);
    });
    return res.json({ data: calculated });
  } catch (error) { return next(error); }
}

async function releasePayout(req, res, next) {
  let payoutId;
  try {
    const poolId = req.validated.params.id;
    const { recipientId, position } = req.validated.body;
    const ruleResult = await db.query(
      `SELECT dr.amount, pp.currency, pp.status, pp.created_by AS "createdBy" FROM distribution_rules dr
       JOIN prize_pools pp ON pp.id = dr.prize_pool_id WHERE dr.prize_pool_id = $1 AND dr.position = $2`,
      [poolId, position],
    );
    const rule = ruleResult.rows[0];
    if (!rule) throw new HttpError(404, 'No existe una regla para esa posición');
    assertOrganizerOwnership(req, rule.createdBy);
    if (!['locked', 'distributed'].includes(rule.status)) throw new HttpError(409, 'La distribución aún no está cerrada');

    const officialWinner = await db.query(
      `SELECT tw.recipient_id AS "recipientId" FROM tournament_winners tw
       JOIN tournament_result_imports tri ON tri.id = tw.result_import_id
       WHERE tri.prize_pool_id = $1 AND tw.position = $2 ORDER BY tri.received_at DESC LIMIT 1`,
      [poolId, position],
    );
    if (officialWinner.rows[0] && officialWinner.rows[0].recipientId !== recipientId) {
      throw new HttpError(409, 'El ganador seleccionado no coincide con el resultado oficial');
    }

    const existingResult = await db.query(
      `SELECT id, recipient_id AS "recipientId", status, attempt_count AS "attemptCount",
       amount, platform_fee_percentage AS "platformFeePercentage", platform_fee_amount AS "platformFeeAmount",
       net_amount AS "netAmount", receipt_code AS "receiptCode" FROM payouts
       WHERE prize_pool_id = $1 AND position = $2`,
      [poolId, position],
    );
    const existing = existingResult.rows[0];
    if (existing?.status === 'released') throw new HttpError(409, 'Esta posición ya fue pagada');
    if (existing?.status === 'pending') throw new HttpError(409, 'El envío de este premio ya está en proceso');
    if (existing && existing.recipientId !== recipientId) throw new HttpError(409, 'El reintento debe conservar al mismo ganador');

    const settings = await paymentSettingsService.getSettings();
    const amounts = existing
      ? {
        grossAmount: Number(existing.amount),
        platformFeePercentage: Number(existing.platformFeePercentage),
        platformFeeAmount: Number(existing.platformFeeAmount),
        netAmount: Number(existing.netAmount),
      }
      : paymentSettingsService.calculateAmounts(rule.amount, settings.platformFeePercentage);
    const attempt = Number(existing?.attemptCount || 0) + 1;
    const receiptCode = existing?.receiptCode || `TX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    payoutId = existing?.id || crypto.randomUUID();

    await db.transaction(async (client) => {
      if (existing) {
        await client.query(
          `UPDATE payouts SET status = 'pending', attempt_count = $1, last_error = NULL, released_by = $2 WHERE id = $3`,
          [attempt, req.user.sub, payoutId],
        );
      } else {
        await client.query(
          `INSERT INTO payouts (id, prize_pool_id, recipient_id, position, amount, platform_fee_percentage,
           platform_fee_amount, net_amount, currency, destination, status, attempt_count, receipt_code, released_by, released_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'stripe:pending','pending',$10,$11,$12,NULL)`,
          [payoutId, poolId, recipientId, position, amounts.grossAmount, amounts.platformFeePercentage,
            amounts.platformFeeAmount, amounts.netAmount, rule.currency, attempt, receiptCode, req.user.sub],
        );
      }
      await client.query(
        `INSERT INTO payout_events (id, payout_id, event_type, message, performed_by) VALUES ($1,$2,$3,$4,$5)`,
        [crypto.randomUUID(), payoutId, existing ? 'retried' : 'created', existing ? 'Nuevo intento de envío' : 'Premio preparado para envío', req.user.sub],
      );
    });

    let transfer;
    if (env.stripeMode === 'test') {
      transfer = await stripeConnectService.createPrizeTransfer({
        prizePoolId: poolId,
        recipientId,
        position,
        amount: amounts.netAmount,
        currency: rule.currency,
        attempt,
      });
    } else if (env.isTestRun) {
      transfer = { destination: `stripe:test:${recipientId}`, providerReference: null };
    } else {
      throw new HttpError(503, 'Stripe Connect no está configurado para enviar el premio');
    }
    await db.transaction(async (client) => {
      await client.query(
        `UPDATE payouts SET destination = $1, provider_reference = $2, status = 'released',
         last_error = NULL, released_at = NOW() WHERE id = $3`,
        [transfer.destination, transfer.providerReference, payoutId],
      );
      await client.query(
        `INSERT INTO payout_events (id, payout_id, event_type, message, performed_by) VALUES ($1,$2,'released',$3,$4)`,
        [crypto.randomUUID(), payoutId, 'Premio enviado correctamente', req.user.sub],
      );
    });
    const { rows } = await db.query(
      `SELECT id, recipient_id AS "recipientId", position, amount, platform_fee_percentage AS "platformFeePercentage",
       platform_fee_amount AS "platformFeeAmount", net_amount AS "netAmount", currency,
       provider_reference AS "providerReference", status, attempt_count AS "attemptCount", receipt_code AS "receiptCode",
       released_at AS "releasedAt" FROM payouts WHERE id = $1`,
      [payoutId],
    );
    const pending = await db.query(
      `SELECT COUNT(*) AS count FROM distribution_rules dr
       LEFT JOIN payouts p ON p.prize_pool_id = dr.prize_pool_id AND p.position = dr.position AND p.status = 'released'
       WHERE dr.prize_pool_id = $1 AND p.id IS NULL`,
      [poolId],
    );
    if (Number(pending.rows[0].count) === 0) await db.query("UPDATE prize_pools SET status = 'distributed', updated_at = NOW() WHERE id = $1", [poolId]);
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    if (payoutId) {
      const message = String(error?.message || 'No fue posible enviar el premio').slice(0, 255);
      try {
        await db.transaction(async (client) => {
          await client.query("UPDATE payouts SET status = 'failed', last_error = $1 WHERE id = $2", [message, payoutId]);
          await client.query(
            `INSERT INTO payout_events (id, payout_id, event_type, message, performed_by) VALUES ($1,$2,'failed',$3,$4)`,
            [crypto.randomUUID(), payoutId, message, req.user.sub],
          );
        });
      } catch (_auditError) { /* Se conserva el error original. */ }
      if (!(error instanceof HttpError)) return next(new HttpError(502, 'No fue posible enviar el premio. Puedes intentarlo nuevamente.'));
    }
    return next(error);
  }
}

async function reconciliation(req, res, next) {
  try {
    const poolId = req.validated.params.id;
    const poolResult = await db.query(`${poolSelect} WHERE id = $1`, [poolId]);
    const prizePool = poolResult.rows[0];
    if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
    assertOrganizerOwnership(req, prizePool.createdBy);
    const contributionTotals = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected,
       COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) AS refunded
       FROM contributions WHERE prize_pool_id = $1`,
      [poolId],
    );
    const payoutTotals = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) AS awarded,
       COALESCE(SUM(CASE WHEN status = 'released' THEN platform_fee_amount ELSE 0 END), 0) AS fees,
       COALESCE(SUM(CASE WHEN status = 'released' THEN net_amount ELSE 0 END), 0) AS transferred,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
       FROM payouts WHERE prize_pool_id = $1`,
      [poolId],
    );
    const events = await db.query(
      `SELECT pe.id, pe.payout_id AS "payoutId", pe.event_type AS "eventType", pe.message,
       pe.created_at AS "createdAt", p.position, p.status FROM payout_events pe
       JOIN payouts p ON p.id = pe.payout_id WHERE p.prize_pool_id = $1 ORDER BY pe.created_at DESC LIMIT 50`,
      [poolId],
    );
    return res.json({ data: {
      prizePoolId: poolId,
      currency: prizePool.currency,
      available: Number(prizePool.fundedAmount),
      collected: Number(contributionTotals.rows[0].collected),
      refunded: Number(contributionTotals.rows[0].refunded),
      awarded: Number(payoutTotals.rows[0].awarded),
      platformFees: Number(payoutTotals.rows[0].fees),
      transferred: Number(payoutTotals.rows[0].transferred),
      pending: Number(payoutTotals.rows[0].pending),
      failed: Number(payoutTotals.rows[0].failed),
      events: events.rows,
    } });
  } catch (error) { return next(error); }
}

async function cancel(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM prize_pools WHERE id = $1', [req.validated.params.id]);
    const prizePool = rows[0];
    if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
    assertOrganizerOwnership(req, prizePool.created_by);
    if (!['draft', 'funding'].includes(prizePool.status)) throw new HttpError(409, 'La bolsa ya no puede cancelarse');
    if (Number(prizePool.funded_amount) > 0) throw new HttpError(409, 'Reembolsa primero todas las aportaciones pagadas');
    await db.query("UPDATE prize_pools SET status = 'cancelled' WHERE id = $1", [prizePool.id]);
    const updated = await db.query(`${poolSelect} WHERE id = $1`, [prizePool.id]);
    return res.json({ data: updated.rows[0] });
  } catch (error) { return next(error); }
}

module.exports = { listPublic, list, create, getById, contribute, defineDistribution, releasePayout, reconciliation, cancel };
