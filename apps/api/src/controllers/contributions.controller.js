const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const stripeGateway = require('../services/stripe-gateway');
const binanceSimulator = require('../services/binance-pay-simulator');
const env = require('../config/env');

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
      if (status === 'refunded' && contribution.pool_status !== 'funding') {
        throw new HttpError(409, 'No se puede reembolsar una aportación después de bloquear la bolsa');
      }

      return transitionContribution(client, contribution, status, req.user.sub, notes);
    });
    res.json({ data: updated });
  } catch (error) { next(error); }
}

async function captureStripe(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM contributions WHERE id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    if (contribution.provider !== 'stripe') throw new HttpError(409, 'La aportación no pertenece a Stripe');
    if (contribution.status !== 'authorized') throw new HttpError(409, 'La autorización de Stripe todavía no está lista para captura');
    const stripeResult = await stripeGateway.capturePayment(contribution.provider_reference);
    const updated = await db.transaction((client) => transitionContribution(client, contribution, 'paid', req.user.sub, `Stripe ${stripeResult.providerStatus}`));
    res.json({ data: updated, providerStatus: stripeResult.providerStatus });
  } catch (error) { next(error); }
}

async function authorizeStripeTest(req, res, next) {
  try {
    if (env.nodeEnv === 'production' || env.stripeMode !== 'test') throw new HttpError(404, 'Demostración Stripe no disponible');
    const result = await db.query('SELECT * FROM contributions WHERE id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    if (contribution.provider !== 'stripe' || contribution.status !== 'pending') throw new HttpError(409, 'La aportación Stripe no está pendiente');
    const stripeResult = await stripeGateway.confirmTestPayment(contribution.provider_reference);
    res.json({ providerStatus: stripeResult.providerStatus, awaitingWebhook: true });
  } catch (error) { next(error); }
}

async function cancelStripe(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM contributions WHERE id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    if (contribution.provider !== 'stripe') throw new HttpError(409, 'La aportación no pertenece a Stripe');
    if (!['pending', 'authorized'].includes(contribution.status)) throw new HttpError(409, 'La autorización de Stripe ya no puede cancelarse');
    const stripeResult = await stripeGateway.cancelPayment(contribution.provider_reference);
    const updated = await db.transaction((client) => transitionContribution(client, contribution, 'cancelled', req.user.sub, `Stripe ${stripeResult.providerStatus}`));
    res.json({ data: updated, providerStatus: stripeResult.providerStatus });
  } catch (error) { next(error); }
}

async function simulateBinance(req, res, next) {
  try {
    if (env.nodeEnv === 'production' || env.binancePayMode !== 'simulated') throw new HttpError(404, 'Simulador no disponible');
    const result = await db.query('SELECT * FROM contributions WHERE id = $1', [req.validated.params.id]);
    const contribution = result.rows[0];
    if (!contribution) throw new HttpError(404, 'Aportación no encontrada');
    if (contribution.provider !== 'binance_pay') throw new HttpError(409, 'La aportación no pertenece a Binance Pay');
    const requested = req.validated.body.status;
    const status = requested === 'paid' ? 'paid' : requested;
    const notification = binanceSimulator.signNotification({
      bizType: 'PAY', bizStatus: status === 'paid' ? 'PAY_SUCCESS' : status.toUpperCase(),
      data: JSON.stringify({ merchantTradeNo: contribution.id, prepayId: contribution.provider_reference }),
    });
    if (!binanceSimulator.verifyNotification(notification.rawBody, notification.headers)) throw new HttpError(400, 'Firma Binance simulada inválida');
    const updated = await db.transaction((client) => transitionContribution(client, contribution, status, 'binance-simulator', `Webhook RSA-SHA256 ${status}`));
    res.json({ data: updated, webhookVerified: true, simulated: true });
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

module.exports = { list, changeStatus, history, captureStripe, cancelStripe, authorizeStripeTest, simulateBinance, transitionContribution };
