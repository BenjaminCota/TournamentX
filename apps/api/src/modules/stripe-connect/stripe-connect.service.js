const env = require('../../config/env');
const HttpError = require('../../utils/http-error');
const stripeGateway = require('../../services/stripe-gateway');
const store = require('./stripe-connect.store');
const teamStore = require('../teams/team-store');
const authStore = require('../auth/auth.store');

function assertTestMode() {
  if (env.stripeMode !== 'test') throw new HttpError(503, 'Stripe Connect requiere STRIPE_MODE=test en el entorno local');
}

function statusFromStripe(account, previous = {}) {
  const requirements = account.requirements || {};
  const currentlyDue = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
  let status = 'onboarding_required';
  if (account.payouts_enabled) status = 'ready';
  else if (!account.details_submitted) status = 'onboarding_required';
  else if (requirements.disabled_reason) status = 'restricted';
  else status = 'pending_verification';

  return {
    ...previous,
    stripeAccountId: account.id,
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    requirementsDue: currentlyDue.length,
    disabledReason: requirements.disabled_reason || null,
    status,
    updatedAt: new Date().toISOString(),
  };
}

function publicStatus(record) {
  if (!record) {
    return {
      status: 'not_created',
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: 0,
      disabledReason: null,
      mode: env.stripeMode,
    };
  }
  const { userId: _userId, ...safe } = record;
  return { ...safe, mode: env.stripeMode };
}

async function refresh(userId) {
  const current = store.findByUserId(userId);
  if (!current) return null;
  assertTestMode();
  const stripeAccount = await stripeGateway.retrieveConnectedAccount(current.stripeAccountId);
  return store.save(statusFromStripe(stripeAccount, current));
}

async function getStatus(userId) {
  const current = store.findByUserId(userId);
  if (!current || env.stripeMode !== 'test') return publicStatus(current);
  return publicStatus(await refresh(userId));
}

async function ensureAccount(user) {
  assertTestMode();
  const current = store.findByUserId(user.id);
  if (current) return refresh(user.id);

  const stripeAccount = await stripeGateway.createConnectedAccount({
    userId: user.id,
    email: user.email,
  });
  const now = new Date().toISOString();
  return store.save(statusFromStripe(stripeAccount, {
    userId: user.id,
    createdAt: now,
  }));
}

async function createOnboardingLink(user) {
  const record = await ensureAccount(user);
  const link = await stripeGateway.createConnectOnboardingLink(record.stripeAccountId);
  return { account: publicStatus(record), url: link.url, expiresAt: link.expires_at || null };
}

async function createDashboardLink(userId) {
  const record = await refresh(userId);
  if (!record) throw new HttpError(409, 'Primero configura tu cuenta de Stripe para cobrar premios');
  if (!record.detailsSubmitted) throw new HttpError(409, 'Completa primero el registro alojado por Stripe');
  const link = await stripeGateway.createConnectDashboardLink(record.stripeAccountId);
  return { url: link.url };
}

function captainForRecipient(recipientId) {
  const team = teamStore.getTeam(recipientId);
  if (team) {
    if (!team.captainUserId) throw new HttpError(409, 'El equipo ganador todavía no tiene un capitán asignado');
    return team.captainUserId;
  }
  const directCaptain = authStore.findById(recipientId);
  if (directCaptain && authStore.normalizeRole(directCaptain.role) === 'captain') return directCaptain.id;
  throw new HttpError(409, 'El ganador debe ser un equipo con capitán registrado en TournamentX');
}

async function createPrizeTransfer({ prizePoolId, recipientId, position, amount, currency, attempt = 1 }) {
  assertTestMode();
  const captainUserId = captainForRecipient(recipientId);
  const account = await refresh(captainUserId);
  if (!account) throw new HttpError(409, 'El capitán ganador todavía no configuró su cuenta de Stripe');
  if (!account.payoutsEnabled) throw new HttpError(409, 'La cuenta Stripe del capitán todavía no puede recibir premios');

  try {
    const transfer = await stripeGateway.createTransfer({
      amount,
      currency,
      destination: account.stripeAccountId,
      prizePoolId,
      recipientId,
      position,
      attempt,
    });
    return {
      providerReference: transfer.id,
      destination: account.stripeAccountId,
      captainUserId,
      status: 'released',
    };
  } catch (error) {
    if (error?.code === 'balance_insufficient') {
      throw new HttpError(409, 'Stripe todavía no tiene saldo disponible en esta moneda; espera la liberación de los cobros y vuelve a intentarlo');
    }
    throw error;
  }
}

function updateFromWebhook(stripeAccount) {
  const current = store.findByStripeAccountId(stripeAccount.id);
  if (!current) return null;
  return store.save(statusFromStripe(stripeAccount, current));
}

module.exports = {
  getStatus,
  ensureAccount,
  createOnboardingLink,
  createDashboardLink,
  createPrizeTransfer,
  captainForRecipient,
  publicStatus,
  statusFromStripe,
  updateFromWebhook,
};
