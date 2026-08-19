const HttpError = require('../../utils/http-error');
const scheduleStore = require('./schedule-store');
const { getActiveTeam } = require('../teams/teams.public');
const { getRegisteredTeamIds } = require('../tournaments/tournaments.public');
const tournamentStore = require('../tournaments/tournament-store');
const { assertOrganizerOwnership } = require('../../utils/resource-ownership');
const { publishTournamentUpdate } = require('../../utils/realtime');

async function listSchedules(req, res, next) {
  try {
    res.json(await scheduleStore.listSchedules(req.validated.query));
  } catch (error) {
    next(error);
  }
}

async function getSchedule(req, res, next) {
  try {
    const schedule = await scheduleStore.getSchedule(req.validated.params.id);
    if (!schedule) throw new HttpError(404, 'Calendario no encontrado');
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

async function createSchedule(req, res, next) {
  try {
    const tournament = tournamentStore.getTournament(req.validated.body.tournamentId);
    assertOrganizerOwnership(req, tournament.createdBy, 'Solo el administrador o el organizador creador puede programar este torneo');
    if (['CANCELLED', 'COMPLETED'].includes(tournament.status)) {
      throw new HttpError(409, 'No se puede programar un torneo cancelado o finalizado');
    }
    if (req.validated.body.startsAt.getTime() < Date.now()) {
      throw new HttpError(400, 'La fecha de inicio del calendario no puede estar en el pasado');
    }
    const missing = req.validated.body.teamIds.find((teamId) => !getActiveTeam(teamId));
    if (missing) throw new HttpError(404, `El equipo ${missing} no existe o no está activo`);
    const registered = getRegisteredTeamIds(req.validated.body.tournamentId);
    if (!registered) throw new HttpError(404, `El torneo ${req.validated.body.tournamentId} no existe`);
    const unregistered = req.validated.body.teamIds.find((teamId) => !registered.has(teamId));
    if (unregistered) throw new HttpError(409, `El equipo ${unregistered} no está inscrito en el torneo`);
    const schedule = await scheduleStore.createSchedule(req.validated.body);
    publishTournamentUpdate(req.app, req.validated.body.tournamentId, 'schedule-published');
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSchedules, getSchedule, createSchedule };
