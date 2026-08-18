const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const stripeGateway = require('../services/stripe-gateway');
const env = require('../config/env');
const { assertOrganizerOwnership, isOrganizer } = require('../utils/resource-ownership');

const allowedTransitions = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'cancelled'],
  paid: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};

async function transitionContribution(client, contribution, status, performedBy, notes) {
  if (contribution.status === status) return contribution;
  if (!allowedTransitions[contribution.status]?.includes(status)) {
    throw new HttpError(409, `No se puede cambiar un pago de ${contribution.status} a ${status}`);
  }
  await client.query('UPDATE contributions SET status = $1 WHERE id = $2', [status, contribution.id]);
  if (status === 'paid' && contribution.status !== 'paid') {
    await client.query('UPDATE prize_pools SET funded_amount = funded_amount + $1 WHERE id = $2', [contribution.amount, contribution.prize_pool_id]);
  }
  if (contribution.status === 'paid' && status === 'refunded') {
    await client.query('UPDATE prize_pools SET funded_amount = GREATEST(funded_amount - $1, 0) WHERE id = $2', [contribution.amount, contribution.prize_pool_id]);
  }
  const eventType = { authorized: 'authorized', paid: 'captured', failed: 'failed', cancelled: 'cancelled', refunded: 'refunded' }[status];
  await client.query(
    `INSERT INTO payment_events (id, contribution_id, event_type, previous_status, new_status, performed_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [crypto.randomUUID(), contribution.id, eventType, contribution.status, status, performedBy, notes || null],
  );
  const finalResult = await client.query('SELECT * FROM contributions WHERE id = $1', [contribution.id]);
  return finalResult.rows[0];
}

async function list(req, res, next) {
  try {
    const conditions = [];
    const params = [];
    if (req.query.prizePoolId) { params.push(req.query.prizePoolId); conditions.push(`c.prize_pool_id = $${params.length}`); }
    if (req.query.status) { params.push(req.query.status); conditions.push(`c.status = $${params.length}`); }
    if (isOrganizer(req)) { params.push(req.user.sub); conditions.push(`pp.created_by = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT c.id, c.prize_pool_id AS "prizePoolId", c.sponsor_id AS "sponsorId", s.name AS "sponsorName",
       c.amount, c.currency, c.provider, c.provider_reference AS "providerReference", c.status,
       c.provider_refund_reference AS "providerRefundReference", c.refunded_at AS "refundedAt",
       c.created_at AS "createdAt" FROM contributions c JOIN sponsors s ON s.id = c.sponsor_id
       JOIN prize_pools pp ON pp.id = c.prize_pool_id
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
    if (status === 'refunded') return refundStripe(req, res, next);
    if (!env.isTestRun && ['authorized', 'paid'].includes(status)) {
      throw new HttpError(409, 'La autorización y captura deben confirmarse mediante Stripe');
    }
    const updated = await db.transaction(async (client) => {
      const result = await client.query(
        `SELECT c.*, pp.status AS "poolStatus", pp.created_by AS "poolCreatedBy" FROM contributions c
         JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1 FOR UPDATE`,
        [id],
      );
      const contribution = result.rows[0];
      if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
      assertOrganizerOwnership(req, contribution.poolCreatedBy);
      if (status === 'refunded' && contribution.poolStatus !== 'funding') {
        throw new HttpError(409, 'No se puede reembolsar una aportación después de bloquear la bolsa');
      }

      return transitionContribution(client, contribution, status, req.user.sub, notes);
    });
    res.json({ data: updated });
  } catch (error) { next(error); }
}

async function refundStripe(req, res, next) {
  try {
    const result = await db.transaction(async (client) => {
      const selected = await client.query(
        `SELECT c.*, pp.status AS "poolStatus", pp.created_by AS "poolCreatedBy" FROM contributions c
         JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1 FOR UPDATE`,
        [req.validated.params.id],
      );
      const contribution = selected.rows[0];
      if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
      assertOrganizerOwnership(req, contribution.poolCreatedBy);
      if (contribution.status === 'refunded') return { contribution, reused: true, providerStatus: 'succeeded' };
      if (contribution.status !== 'paid') throw new HttpError(409, 'Solo se puede reembolsar una aportación pagada');
      if (contribution.poolStatus !== 'funding') throw new HttpError(409, 'La bolsa ya está cerrada y no permite reembolsos');
      if (contribution.provider !== 'stripe') throw new HttpError(409, 'La aportación no pertenece a Stripe');

      let refund;
      if (env.stripeMode === 'test') {
        refund = await stripeGateway.refundPayment(contribution.provider_reference);
      } else if (env.isTestRun) {
        refund = { providerReference: `refund_test_${Date.now()}`, providerStatus: 'succeeded' };
      } else {
        throw new HttpError(503, 'Stripe no está configurado para reembolsar la aportación');
      }
      await transitionContribution(client, contribution, 'refunded', req.user.sub, req.validated.body?.notes || 'Reembolso solicitado');
      await client.query(
        'UPDATE contributions SET provider_refund_reference = $1, refunded_at = NOW() WHERE id = $2',
        [refund.providerReference, contribution.id],
      );
      const updated = await client.query(
        `SELECT id, prize_pool_id AS "prizePoolId", sponsor_id AS "sponsorId", amount, currency, provider,
         provider_reference AS "providerReference", provider_refund_reference AS "providerRefundReference",
         status, refunded_at AS "refundedAt", created_at AS "createdAt" FROM contributions WHERE id = $1`,
        [contribution.id],
      );
      return { contribution: updated.rows[0], reused: false, providerStatus: refund.providerStatus };
    });
    return res.json({ data: result.contribution, reused: result.reused, providerStatus: result.providerStatus });
  } catch (error) { return next(error); }
}

async function captureStripe(req, res, next) {
  try {
    const result = await db.query('SELECT c.*, pp.created_by AS "poolCreatedBy" FROM contributions c JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    assertOrganizerOwnership(req, contribution.poolCreatedBy);
    if (contribution.provider !== 'stripe') throw new HttpError(409, 'La aportación no pertenece a Stripe');
    if (contribution.status !== 'authorized') throw new HttpError(409, 'La autorización de Stripe todavía no está lista para captura');
    const stripeResult = await stripeGateway.capturePayment(contribution.provider_reference);
    const updated = await db.transaction((client) => transitionContribution(client, contribution, 'paid', req.user.sub, `Stripe ${stripeResult.providerStatus}`));
    res.json({ data: updated, providerStatus: stripeResult.providerStatus });
  } catch (error) { next(error); }
}

async function authorizeStripeTest(req, res, next) {
  try {
    if (env.nodeEnv === 'production' || env.stripeMode !== 'test') throw new HttpError(404, 'Confirmación Stripe Test no disponible');
    const result = await db.query('SELECT c.*, pp.created_by AS "poolCreatedBy" FROM contributions c JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    assertOrganizerOwnership(req, contribution.poolCreatedBy);
    if (contribution.provider !== 'stripe' || contribution.status !== 'pending') throw new HttpError(409, 'La aportación Stripe no está pendiente');
    const stripeResult = await stripeGateway.confirmTestPayment(contribution.provider_reference);
    res.json({ providerStatus: stripeResult.providerStatus, awaitingWebhook: true });
  } catch (error) { next(error); }
}

async function cancelStripe(req, res, next) {
  try {
    const result = await db.query('SELECT c.*, pp.created_by AS "poolCreatedBy" FROM contributions c JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    assertOrganizerOwnership(req, contribution.poolCreatedBy);
    if (contribution.provider !== 'stripe') throw new HttpError(409, 'La aportación no pertenece a Stripe');
    if (!['pending', 'authorized'].includes(contribution.status)) throw new HttpError(409, 'La autorización de Stripe ya no puede cancelarse');
    const stripeResult = await stripeGateway.cancelPayment(contribution.provider_reference);
    const updated = await db.transaction((client) => transitionContribution(client, contribution, 'cancelled', req.user.sub, `Stripe ${stripeResult.providerStatus}`));
    res.json({ data: updated, providerStatus: stripeResult.providerStatus });
  } catch (error) { next(error); }
}

async function history(req, res, next) {
  try {
    const ownership = await db.query('SELECT pp.created_by AS "createdBy" FROM contributions c JOIN prize_pools pp ON pp.id = c.prize_pool_id WHERE c.id = $1', [req.validated.params.id]);
    if (!ownership.rows[0]) throw new HttpError(404, 'Aportación no encontrada');
    assertOrganizerOwnership(req, ownership.rows[0].createdBy);
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

module.exports = { list, changeStatus, history, captureStripe, cancelStripe, authorizeStripeTest, refundStripe, transitionContribution };
