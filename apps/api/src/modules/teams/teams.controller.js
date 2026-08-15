const HttpError = require('../../utils/http-error');
const teamStore = require('./team-store');

async function listTeams(_req, res, next) {
  try {
    res.json(teamStore.listTeams());
  } catch (error) {
    next(error);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = teamStore.getTeam(req.params.id);
    if (!team) throw new HttpError(404, 'Equipo no encontrado');
    res.json(team);
  } catch (error) {
    next(error);
  }
}

async function createTeam(req, res, next) {
  try {
    const team = teamStore.createTeam(req.body);
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    const team = teamStore.updateTeam(req.params.id, req.body);
    if (!team) throw new HttpError(404, 'Equipo no encontrado');
    res.json(team);
  } catch (error) {
    next(error);
  }
}

async function listPlayers(_req, res, next) {
  try {
    res.json(teamStore.listPlayers());
  } catch (error) {
    next(error);
  }
}

async function getPlayer(req, res, next) {
  try {
    const player = teamStore.getPlayer(req.params.id);
    if (!player) throw new HttpError(404, 'Jugador no encontrado');
    res.json(player);
  } catch (error) {
    next(error);
  }
}

async function createPlayer(req, res, next) {
  try {
    const player = teamStore.createPlayer(req.body);
    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
}

async function updatePlayer(req, res, next) {
  try {
    const player = teamStore.updatePlayer(req.params.id, req.body);
    if (!player) throw new HttpError(404, 'Jugador no encontrado');
    res.json(player);
  } catch (error) {
    next(error);
  }
}

async function addRosterMember(req, res, next) {
  try {
    const result = teamStore.addMemberToRoster(req.params.id, req.body);
    if (result.error) {
      const error = new HttpError(409, result.error);
      throw error;
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function removeRosterMember(req, res, next) {
  try {
    const result = teamStore.removeMemberFromRoster(req.params.id, req.params.playerId);
    if (!result) throw new HttpError(404, 'Esta relación no existe');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  addRosterMember,
  removeRosterMember,
};
