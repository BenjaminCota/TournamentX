const HttpError = require('../../utils/http-error');
const matchStore = require('./match-store');
const { getActiveTeam } = require('../teams/teams.public');
const teamStore = require('../teams/team-store');
const { getRegisteredTeamIds } = require('../tournaments/tournaments.public');
const tournamentStore = require('../tournaments/tournament-store');
const workflowStore = require('./match-workflow.store');
const { synchronizeOfficialResult } = require('./match-integration.service');
const { assertOrganizerOwnership } = require('../../utils/resource-ownership');

function assertTournamentManager(req, tournamentId) {
  const tournament = tournamentStore.getTournament(tournamentId);
  assertOrganizerOwnership(req, tournament.createdBy, 'Solo el administrador o el organizador creador puede administrar los partidos de este torneo');
  return tournament;
}

function assertTournamentOperational(tournament) {
  if (['CANCELLED', 'COMPLETED'].includes(tournament.status)) {
    throw new HttpError(409, 'No se pueden modificar partidos de un torneo cancelado o finalizado');
  }
}

function assertActiveTeams(teamIds) {
  const missing = teamIds.find((teamId) => !getActiveTeam(teamId));
  if (missing) throw new HttpError(404, `El equipo ${missing} no existe o no está activo`);
}

function assertTournamentTeams(tournamentId, teamIds) {
  const registered = getRegisteredTeamIds(tournamentId);
  if (!registered) throw new HttpError(404, `El torneo ${tournamentId} no existe`);
  const unregistered = teamIds.find((teamId) => !registered.has(teamId));
  if (unregistered) throw new HttpError(409, `El equipo ${unregistered} no está inscrito en el torneo`);
}

async function listMatches(req, res, next) {
  try {
    const matches = await matchStore.listMatches(req.validated.query);
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

async function getMatch(req, res, next) {
  try {
    const match = await matchStore.getMatch(req.validated.params.id);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    res.json(match);
  } catch (error) {
    next(error);
  }
}

async function createMatch(req, res, next) {
  try {
    const tournament = assertTournamentManager(req, req.validated.body.tournamentId);
    assertTournamentOperational(tournament);
    if (req.validated.body.scheduledAt.getTime() < Date.now()) {
      throw new HttpError(400, 'La fecha del partido no puede estar en el pasado');
    }
    assertActiveTeams([req.validated.body.team1Id, req.validated.body.team2Id]);
    assertTournamentTeams(req.validated.body.tournamentId, [req.validated.body.team1Id, req.validated.body.team2Id]);
    const match = await matchStore.createMatch(req.validated.body);
    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
}

async function updateMatchScore(req, res, next) {
  try {
    const existing = await matchStore.getMatch(req.validated.params.id);
    if (!existing) throw new HttpError(404, 'Partido no encontrado');
    const tournament = assertTournamentManager(req, existing.tournamentId);
    assertTournamentOperational(tournament);
    const match = await matchStore.updateMatchScore(req.validated.params.id, req.validated.body);
    req.app.get('io')?.to(`match:${match.id}`).emit('match-update', match);
    const integration = match.status === 'completed' ? await synchronizeOfficialResult(req.app, match, req.user.sub) : null;
    res.json(integration ? { ...match, integration } : match);
  } catch (error) {
    next(error);
  }
}

function assertCaptainTeam(req, match, teamId) {
  if (![match.team1Id, match.team2Id].includes(teamId)) throw new HttpError(409, 'El equipo no participa en este partido');
  if (!teamStore.canUserManageTeam(teamId, req.user.sub)) throw new HttpError(403, 'Solo el capitÃ¡n registrado del equipo puede realizar esta acciÃ³n');
}

async function getManagedMatch(req) {
  const match = await matchStore.getMatch(req.validated.params.id);
  if (!match) throw new HttpError(404, 'Partido no encontrado');
  return match;
}

async function getWorkflow(req, res, next) {
  try {
    const match = await matchStore.getMatch(req.validated.params.id);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    res.json({ match, ...workflowStore.getWorkflow(match.id) });
  } catch (error) { next(error); }
}

async function checkIn(req, res, next) {
  try {
    const match = await getManagedMatch(req);
    assertTournamentOperational(tournamentStore.getTournament(match.tournamentId));
    assertCaptainTeam(req, match, req.validated.body.teamId);
    if (['completed', 'cancelled'].includes(match.status)) throw new HttpError(409, 'El partido ya estÃ¡ cerrado');
    const opensAt = new Date(match.scheduledAt).getTime() - 30 * 60 * 1000;
    if (Date.now() < opensAt) throw new HttpError(409, 'El check-in abre 30 minutos antes de la partida');
    const result = workflowStore.checkIn(match.id, req.validated.body.teamId, req.user.sub);
    const workflow = workflowStore.getWorkflow(match.id);
    let updatedMatch = match;
    if (workflow.checkIns.filter((entry) => entry.status === 'CONFIRMED').length >= 2 && match.status === 'scheduled') {
      updatedMatch = await matchStore.updateMatchScore(match.id, { status: 'live' });
      req.app.get('io')?.to(`match:${match.id}`).emit('match-update', updatedMatch);
    }
    res.json({ ...result, match: updatedMatch, workflow });
  } catch (error) { next(error); }
}

async function reportResult(req, res, next) {
  try {
    const match = await getManagedMatch(req);
    assertTournamentOperational(tournamentStore.getTournament(match.tournamentId));
    assertCaptainTeam(req, match, req.validated.body.teamId);
    const workflow = workflowStore.getWorkflow(match.id);
    if (workflow.checkIns.filter((entry) => entry.status === 'CONFIRMED').length < 2) throw new HttpError(409, 'Ambos equipos deben completar el check-in');
    if (match.status !== 'live') throw new HttpError(409, 'El partido debe estar en vivo para reportar un resultado');
    const result = workflowStore.createReport(match.id, {
      submittedBy: req.user.sub, submittedForTeamId: req.validated.body.teamId,
      team1Score: req.validated.body.team1Score, team2Score: req.validated.body.team2Score, evidenceUrl: req.validated.body.evidenceUrl,
    });
    if (result.error) throw new HttpError(result.status, result.error);
    req.app.get('io')?.to(`match:${match.id}`).emit('match-workflow-update', workflowStore.getWorkflow(match.id));
    res.status(201).json(result);
  } catch (error) { next(error); }
}

async function decideReport(req, res, next) {
  try {
    const match = await getManagedMatch(req);
    const tournament = assertTournamentManager(req, match.tournamentId);
    assertTournamentOperational(tournament);
    const result = workflowStore.decideReport(match.id, req.validated.params.reportId, { ...req.validated.body, reviewedBy: req.user.sub });
    if (result.error) throw new HttpError(result.status, result.error);
    let officialMatch = match; let integration = null;
    if (result.report.status === 'APPROVED') {
      officialMatch = await matchStore.updateMatchScore(match.id, { team1Score: result.report.team1Score, team2Score: result.report.team2Score, status: 'completed' });
      integration = await synchronizeOfficialResult(req.app, officialMatch, req.user.sub);
      req.app.get('io')?.to(`match:${match.id}`).emit('match-update', officialMatch);
    }
    const workflow = workflowStore.getWorkflow(match.id);
    req.app.get('io')?.to(`match:${match.id}`).emit('match-workflow-update', workflow);
    res.json({ ...result, match: officialMatch, integration, workflow });
  } catch (error) { next(error); }
}

async function createDispute(req, res, next) {
  try {
    const match = await getManagedMatch(req);
    assertTournamentOperational(tournamentStore.getTournament(match.tournamentId));
    assertCaptainTeam(req, match, req.validated.body.teamId);
    const result = workflowStore.createDispute(match.id, { openedBy: req.user.sub, teamId: req.validated.body.teamId, reason: req.validated.body.reason, evidenceUrl: req.validated.body.evidenceUrl || null });
    if (result.error) throw new HttpError(result.status, result.error);
    req.app.get('io')?.to(`match:${match.id}`).emit('match-workflow-update', workflowStore.getWorkflow(match.id));
    res.status(201).json(result);
  } catch (error) { next(error); }
}

async function decideDispute(req, res, next) {
  try {
    const match = await getManagedMatch(req);
    const tournament = assertTournamentManager(req, match.tournamentId);
    assertTournamentOperational(tournament);
    const result = workflowStore.decideDispute(match.id, req.validated.params.disputeId, { ...req.validated.body, resolvedBy: req.user.sub });
    if (result.error) throw new HttpError(result.status, result.error);
    const workflow = workflowStore.getWorkflow(match.id);
    req.app.get('io')?.to(`match:${match.id}`).emit('match-workflow-update', workflow);
    res.json({ ...result, workflow });
  } catch (error) { next(error); }
}

module.exports = { listMatches, getMatch, createMatch, updateMatchScore, getWorkflow, checkIn, reportResult, decideReport, createDispute, decideDispute };
