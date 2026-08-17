const HttpError = require('../../utils/http-error');
const matchStore = require('./match-store');
const { publishMatchResult } = require('../geolocation/notifications.service');
const { getActiveTeam } = require('../teams/teams.public');
const { getRegisteredTeamIds } = require('../tournaments/tournaments.public');

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
    const match = await matchStore.updateMatchScore(req.validated.params.id, req.validated.body);
    if (!match) throw new HttpError(404, 'Partido no encontrado');
    req.app.get('io')?.to(`match:${match.id}`).emit('match-update', match);
    if (match.status === 'completed') publishMatchResult(req.app, match);
    res.json(match);
  } catch (error) {
    next(error);
  }
}

module.exports = { listMatches, getMatch, createMatch, updateMatchScore };
