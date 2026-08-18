const env = require('../../config/env');
const HttpError = require('../../utils/http-error');
const paymentGateway = require('../../services/payment-gateway');
const stripeGateway = require('../../services/stripe-gateway');
const teamStore = require('../teams/team-store');
const tournamentStore = require('../tournaments/tournament-store');
const store = require('./registration-payment.store');

function ownedRegistration(id, captainUserId) {
  const registration = store.find(id);
  if (!registration) throw new HttpError(404, 'Pago de inscripción no encontrado');
  if (registration.captainUserId !== captainUserId) throw new HttpError(403, 'Solo el capitán que inició el pago puede administrarlo');
  return registration;
}

function assertCaptainTeam(teamId, captainUserId) {
  const team = teamStore.getTeam(teamId);
  if (!team || team.status !== 'active') throw new HttpError(404, 'El equipo no existe o no está activo');
  if (team.captainUserId !== captainUserId) throw new HttpError(403, 'Solo puedes pagar la inscripción de tu propio equipo');
  return team;
}

function confirmEnrollment(registration) {
  const participants = tournamentStore.listParticipants(registration.tournamentId);
  if (!participants.some((participant) => participant.id === registration.teamId)) {
    tournamentStore.registerParticipant(registration.tournamentId, {
      teamId: registration.teamId,
      teamName: registration.teamName,
      seed: undefined,
    });
  }
  return store.markEnrolled(registration);
}

function finalizePaidRegistration(registration, performedBy, notes) {
  store.transition(registration, 'paid', performedBy, notes);
  return confirmEnrollment(store.find(registration.id));
}

async function create(req, res, next) {
  try {
    const { tournamentId } = req.validated.params;
    const { teamId, idempotencyKey } = req.validated.body;
    const previous = store.findByIdempotencyKey(idempotencyKey, req.user.sub);
    if (previous) return res.json(store.paymentResponse(previous, true));

    const tournament = tournamentStore.getTournament(tournamentId);
    const team = assertCaptainTeam(teamId, req.user.sub);
    if (tournament.status !== 'OPEN') throw new HttpError(409, 'El torneo no acepta inscripciones');
    if (tournament.maxTeams && tournament.registeredTeams + store.countReservations(tournamentId) >= tournament.maxTeams) {
      throw new HttpError(409, 'El torneo alcanzó el cupo máximo, incluyendo pagos en proceso');
    }
    if (tournamentStore.listParticipants(tournamentId).some((participant) => participant.id === teamId)) {
      throw new HttpError(409, 'El equipo ya está inscrito en este torneo');
    }
    const active = store.findActive(tournamentId, teamId);
    if (active) throw new HttpError(409, `Ya existe una inscripción ${active.status} para este equipo`);
    if (!(Number(tournament.entryFee) > 0)) throw new HttpError(409, 'Este torneo no tiene una cuota de inscripción configurada');

    const payment = await paymentGateway.createPayment({
      provider: 'stripe',
      amount: Number(tournament.entryFee),
      currency: tournament.entryCurrency,
      reference: `registration:${tournamentId}:${teamId}`,
      idempotencyKey,
    });
    const registration = store.create({
      tournamentId,
      tournamentName: tournament.name,
      teamId,
      teamName: team.name,
      captainUserId: req.user.sub,
      amount: Number(tournament.entryFee),
      currency: tournament.entryCurrency,
      providerReference: payment.providerReference,
      paymentClientSecret: payment.clientSecret,
      simulated: Boolean(payment.metadata?.simulated),
      idempotencyKey,
      status: payment.status,
    });
    return res.status(201).json(store.paymentResponse(registration));
  } catch (error) { return next(error); }
}

function listMine(req, res, next) {
  try {
    const registrations = store.listMine(req.validated.params.tournamentId, req.user.sub);
    for (const registration of registrations) {
      if (registration.status === 'paid' && registration.enrollmentStatus !== 'confirmed') {
        confirmEnrollment(store.find(registration.id));
      }
    }
    return res.json({ data: store.listMine(req.validated.params.tournamentId, req.user.sub) });
  } catch (error) { return next(error); }
}

function listTeamStatus(req, res, next) {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const teamIds = role === 'captain'
      ? teamStore.listTeams().filter((team) => team.captainUserId === req.user.sub).map((team) => team.id)
      : teamStore.listPlayers().filter((player) => player.authUserId === req.user.sub && player.currentTeamId).map((player) => player.currentTeamId);
    return res.json({ data: store.listForTeams(req.validated.params.tournamentId, teamIds) });
  } catch (error) { return next(error); }
}

async function authorizeTest(req, res, next) {
  try {
    const registration = ownedRegistration(req.validated.params.id, req.user.sub);
    if (registration.status !== 'pending') throw new HttpError(409, 'La inscripción ya no está pendiente');
    if (env.stripeMode === 'test') {
      const result = await stripeGateway.confirmTestPayment(registration.providerReference);
      return res.json({ providerStatus: result.providerStatus, awaitingWebhook: true });
    }
    if (!env.isTestRun) throw new HttpError(503, 'Stripe no está configurado para autorizar la inscripción');
    return res.json({ data: store.transition(registration, 'authorized', req.user.sub, 'Autorización Stripe local'), providerStatus: 'requires_capture' });
  } catch (error) { return next(error); }
}

async function capture(req, res, next) {
  try {
    const registration = ownedRegistration(req.validated.params.id, req.user.sub);
    if (registration.status !== 'authorized') throw new HttpError(409, 'La inscripción todavía no está autorizada');
    let providerStatus = 'succeeded';
    if (env.stripeMode === 'test') {
      const result = await stripeGateway.capturePayment(registration.providerReference);
      providerStatus = result.providerStatus;
    } else if (!env.isTestRun) {
      throw new HttpError(503, 'Stripe no está configurado para capturar la inscripción');
    }
    const data = finalizePaidRegistration(registration, req.user.sub, `Stripe ${providerStatus}`);
    return res.json({ data, providerStatus });
  } catch (error) { return next(error); }
}

async function cancel(req, res, next) {
  try {
    const registration = ownedRegistration(req.validated.params.id, req.user.sub);
    if (!['pending', 'authorized'].includes(registration.status)) throw new HttpError(409, 'La inscripción ya no puede cancelarse');
    let providerStatus = 'canceled';
    if (env.stripeMode === 'test') {
      const result = await stripeGateway.cancelPayment(registration.providerReference);
      providerStatus = result.providerStatus;
    } else if (!env.isTestRun) {
      throw new HttpError(503, 'Stripe no está configurado para cancelar la inscripción');
    }
    const data = store.transition(registration, 'cancelled', req.user.sub, `Stripe ${providerStatus}`);
    return res.json({ data, providerStatus });
  } catch (error) { return next(error); }
}

function transitionFromWebhook(providerReference, status, eventType) {
  const registration = store.findByProviderReference(providerReference);
  if (!registration) return null;
  if (status === 'paid') return finalizePaidRegistration(registration, 'stripe-webhook', eventType);
  return store.transition(registration, status, 'stripe-webhook', eventType);
}

module.exports = { authorizeTest, cancel, capture, create, listMine, listTeamStatus, transitionFromWebhook };
