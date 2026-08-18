const HttpError = require('../../utils/http-error');
const teamStore = require('./team-store');
const authStore = require('../auth/auth.store');

function isPrivileged(req) { return ['admin', 'organizer'].includes(String(req.user?.role || '').toLowerCase()); }
function assertTeamManager(req) {
  if (!isPrivileged(req) && !teamStore.canUserManageTeam(req.params.id, req.user?.sub)) throw new HttpError(403, 'Solo el capitÃ¡n del equipo puede hacer este cambio');
}
function assertPlayerOwner(req, player) {
  if (!isPrivileged(req) && player?.authUserId !== req.user?.sub) throw new HttpError(403, 'Solo puedes modificar tu propio perfil de jugador');
}
function authorizeTeamManager(req, _res, next) { try { assertTeamManager(req); next(); } catch (error) { next(error); } }
function authorizePlayerOwner(req, _res, next) { try { assertPlayerOwner(req, teamStore.getPlayer(req.params.id)); next(); } catch (error) { next(error); } }

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
    const input = req.validated?.body || req.body;
    const team = teamStore.createTeam({ ...input, createdBy: req.user.sub, captainUserId: String(req.user.role).toLowerCase() === 'captain' ? req.user.sub : input.captainUserId });
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    assertTeamManager(req);
    const team = teamStore.updateTeam(req.params.id, req.validated?.body || req.body);
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
    const input = req.validated?.body || req.body;
    const player = teamStore.createPlayer({ ...input, authUserId: isPrivileged(req) ? input.authUserId : req.user.sub });
    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
}

async function updatePlayer(req, res, next) {
  try {
    assertPlayerOwner(req, teamStore.getPlayer(req.params.id));
    const player = teamStore.updatePlayer(req.params.id, req.validated?.body || req.body);
    if (!player) throw new HttpError(404, 'Jugador no encontrado');
    res.json(player);
  } catch (error) {
    next(error);
  }
}

async function addRosterMember(req, res, next) {
  try {
    assertTeamManager(req);
    const result = teamStore.addMemberToRoster(req.params.id, req.validated?.body || req.body);
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
    assertTeamManager(req);
    const result = teamStore.removeMemberFromRoster(req.params.id, req.params.playerId);
    if (!result) throw new HttpError(404, 'Esta relación no existe');
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createInvitation(req, res, next) {
  try { assertTeamManager(req); const result = teamStore.createInvitation(req.params.id, { ...(req.validated?.body || req.body), createdBy: req.user.sub }); if (result.error) throw new HttpError(result.status, result.error); res.status(201).json(result); } catch (error) { next(error); }
}
async function listInvitations(req, res, next) {
  try { assertTeamManager(req); res.json({ data: teamStore.listInvitations(req.params.id) }); } catch (error) { next(error); }
}
async function requestToJoin(req, res, next) {
  try { const result = teamStore.createJoinRequest({ ...(req.validated?.body || req.body), requestedBy: req.user.sub }); if (result.error) throw new HttpError(result.status, result.error); res.status(201).json(result); } catch (error) { next(error); }
}
async function listJoinRequests(req, res, next) {
  try { assertTeamManager(req); res.json({ data: teamStore.listJoinRequests(req.params.id) }); } catch (error) { next(error); }
}
async function decideJoinRequest(req, res, next) {
  try { assertTeamManager(req); const result = teamStore.decideJoinRequest(req.params.id, req.params.requestId, { ...(req.validated?.body || req.body), decidedBy: req.user.sub }); if (result.error) throw new HttpError(result.status, result.error); res.json(result); } catch (error) { next(error); }
}
async function transferCaptain(req, res, next) {
  try {
    assertTeamManager(req);
    const captainUserId = (req.validated?.body || req.body).captainUserId;
    const user = authStore.findById(captainUserId);
    if (!user || !['captain', 'player'].includes(authStore.normalizeRole(user.role))) throw new HttpError(400, 'El nuevo capitÃ¡n debe ser una cuenta de jugador o capitÃ¡n');
    const team = teamStore.transferCaptain(req.params.id, captainUserId);
    if (!team) throw new HttpError(404, 'Equipo no encontrado');
    if (authStore.normalizeRole(user.role) !== 'captain') authStore.updateUser(user.id, { role: 'captain' });
    res.json(team);
  } catch (error) { next(error); }
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
  createInvitation,
  listInvitations,
  requestToJoin,
  listJoinRequests,
  decideJoinRequest,
  transferCaptain,
  authorizeTeamManager,
  authorizePlayerOwner,
};
