const crypto = require('node:crypto');
const localStore = require('../../config/local-store');
const HttpError = require('../../utils/http-error');

const registrations = localStore.collection('tournamentRegistrationPayments', []);
const events = localStore.collection('tournamentRegistrationPaymentEvents', []);

const allowedTransitions = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'cancelled'],
  paid: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};

function persist() {
  localStore.saveCollection('tournamentRegistrationPayments', registrations);
  localStore.saveCollection('tournamentRegistrationPaymentEvents', events);
}

function publicRegistration(registration) {
  if (!registration) return null;
  const { paymentClientSecret: _paymentClientSecret, idempotencyKey: _idempotencyKey, ...safe } = registration;
  return { ...safe };
}

function find(id) {
  return registrations.find((entry) => entry.id === id) || null;
}

function findByProviderReference(providerReference) {
  return registrations.find((entry) => entry.providerReference === providerReference) || null;
}

function findByIdempotencyKey(idempotencyKey, captainUserId) {
  return registrations.find((entry) => entry.idempotencyKey === idempotencyKey && entry.captainUserId === captainUserId) || null;
}

function findActive(tournamentId, teamId) {
  return registrations.find((entry) => entry.tournamentId === tournamentId
    && entry.teamId === teamId
    && ['pending', 'authorized', 'paid'].includes(entry.status)) || null;
}

function listMine(tournamentId, captainUserId) {
  return registrations
    .filter((entry) => entry.tournamentId === tournamentId && entry.captainUserId === captainUserId)
    .map(publicRegistration)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function listForTeams(tournamentId, teamIds) {
  const allowed = new Set(teamIds);
  return registrations
    .filter((entry) => entry.tournamentId === tournamentId && allowed.has(entry.teamId))
    .map((entry) => ({
      id: entry.id,
      tournamentId: entry.tournamentId,
      tournamentName: entry.tournamentName,
      teamId: entry.teamId,
      teamName: entry.teamName,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status,
      enrollmentStatus: entry.enrollmentStatus,
      paidAt: entry.paidAt,
    }))
    .sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
}

function create(input) {
  const now = new Date().toISOString();
  const registration = {
    id: crypto.randomUUID(),
    tournamentId: input.tournamentId,
    tournamentName: input.tournamentName,
    teamId: input.teamId,
    teamName: input.teamName,
    captainUserId: input.captainUserId,
    amount: input.amount,
    currency: input.currency,
    provider: 'stripe',
    providerReference: input.providerReference,
    paymentClientSecret: input.paymentClientSecret || null,
    simulated: Boolean(input.simulated),
    idempotencyKey: input.idempotencyKey,
    status: input.status || 'pending',
    enrollmentStatus: 'awaiting_payment',
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    enrolledAt: null,
  };
  registrations.push(registration);
  events.push({
    id: crypto.randomUUID(),
    registrationId: registration.id,
    eventType: 'created',
    previousStatus: null,
    newStatus: registration.status,
    performedBy: input.captainUserId,
    notes: 'Inscripción Stripe creada',
    createdAt: now,
  });
  persist();
  return registration;
}

function countReservations(tournamentId) {
  return registrations.filter((entry) => entry.tournamentId === tournamentId
    && ['pending', 'authorized', 'paid'].includes(entry.status)
    && entry.enrollmentStatus !== 'confirmed').length;
}

function markEnrolled(registrationOrId) {
  const registration = typeof registrationOrId === 'string' ? find(registrationOrId) : registrationOrId;
  if (!registration) throw new HttpError(404, 'Pago de inscripción no encontrado');
  if (registration.enrollmentStatus === 'confirmed') return publicRegistration(registration);
  registration.enrollmentStatus = 'confirmed';
  registration.enrolledAt = new Date().toISOString();
  registration.updatedAt = registration.enrolledAt;
  events.push({
    id: crypto.randomUUID(),
    registrationId: registration.id,
    eventType: 'enrolled',
    previousStatus: registration.status,
    newStatus: registration.status,
    performedBy: 'tournament-registration',
    notes: 'Equipo inscrito automáticamente después del pago',
    createdAt: registration.enrolledAt,
  });
  persist();
  return publicRegistration(registration);
}

function transition(registrationOrId, status, performedBy, notes) {
  const registration = typeof registrationOrId === 'string' ? find(registrationOrId) : registrationOrId;
  if (!registration) throw new HttpError(404, 'Pago de inscripción no encontrado');
  if (registration.status === status) return publicRegistration(registration);
  if (!allowedTransitions[registration.status]?.includes(status)) {
    throw new HttpError(409, `No se puede cambiar la inscripción de ${registration.status} a ${status}`);
  }
  const previousStatus = registration.status;
  registration.status = status;
  registration.updatedAt = new Date().toISOString();
  if (status === 'paid') registration.paidAt = registration.updatedAt;
  events.push({
    id: crypto.randomUUID(),
    registrationId: registration.id,
    eventType: status,
    previousStatus,
    newStatus: status,
    performedBy,
    notes: notes || null,
    createdAt: registration.updatedAt,
  });
  persist();
  return publicRegistration(registration);
}

function paymentResponse(registration, reused = false) {
  return {
    data: publicRegistration(registration),
    payment: {
      clientSecret: registration.paymentClientSecret || null,
      simulated: registration.simulated,
      mode: registration.simulated ? 'local' : 'stripe-test',
      reused,
    },
  };
}

module.exports = {
  create,
  countReservations,
  find,
  findActive,
  findByIdempotencyKey,
  findByProviderReference,
  listMine,
  listForTeams,
  markEnrolled,
  paymentResponse,
  publicRegistration,
  transition,
};
