const HttpError = require('../../utils/http-error');
const store = require('./tournament-store');
const { publishTournamentChampion } = require('../geolocation/notifications.service');
const { releaseTournamentChampion } = require('../rewards/local-rewards.service');

async function listTournaments(_req, res, next) {
  try {
    res.json(store.listTournaments());
  } catch (error) {
    next(error);
  }
}

async function getTournament(req, res, next) {
  try {
    res.json(store.getTournament(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function createTournament(req, res, next) {
  try {
    if (!req.body.name || !req.body.game) throw new HttpError(400, 'El nombre y el juego/deporte son obligatorios');
    res.status(201).json(store.createTournament({ ...req.body, createdBy: req.user.sub }));
  } catch (error) {
    next(error);
  }
}

async function listParticipants(req, res, next) {
  try {
    res.json(store.listParticipants(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function registerParticipant(req, res, next) {
  try {
    const { teamId, teamName, seed } = req.body;
    res.status(201).json(store.registerParticipant(req.params.id, { teamId, teamName, seed: Number(seed) }));
  } catch (error) {
    next(error);
  }
}

async function generateGroups(req, res, next) {
  try {
    const groupCount = Number(req.body.groupCount);
    res.status(201).json(store.generateGroupsForTournament(req.params.id, groupCount));
  } catch (error) {
    next(error);
  }
}

async function getGroups(req, res, next) {
  try {
    res.json(store.getGroups(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function reportGroupMatchResult(req, res, next) {
  try {
    const score1 = Number(req.body.score1);
    const score2 = Number(req.body.score2);
    res.json(store.reportGroupMatchResult(req.params.id, req.params.matchId, { score1, score2 }));
  } catch (error) {
    next(error);
  }
}

async function generateBracket(req, res, next) {
  try {
    res.status(201).json(store.generateBracket(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getBracket(req, res, next) {
  try {
    res.json(store.getBracket(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function reportBracketMatchResult(req, res, next) {
  try {
    const score1 = Number(req.body.score1);
    const score2 = Number(req.body.score2);
    const result = store.reportBracketMatchResult(req.params.id, req.params.matchId, { score1, score2 });
    const status = store.getStatus(req.params.id);
    if (status.status === 'COMPLETED') {
      const tournament = store.getTournament(req.params.id);
      const champion = [result.team1, result.team2].find((team) => team.winner);
      publishTournamentChampion(req.app, tournament, champion?.name || status.championId);
      await releaseTournamentChampion(req.params.id, req.user.sub);
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getStatus(req, res, next) {
  try {
    res.json(store.getStatus(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function changeStatus(req, res, next) {
  try {
    const allowed = ['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED'];
    if (!allowed.includes(req.body.status)) throw new HttpError(400, 'Estado de torneo no válido');
    res.json(store.changeStatus(req.params.id, req.body.status, req.user.sub, String(req.body.note || '').slice(0, 500)));
  } catch (error) { next(error); }
}

async function listAudit(req, res, next) {
  try { res.json({ data: store.listAudit(req.params.id) }); } catch (error) { next(error); }
}

module.exports = {
  listTournaments,
  getTournament,
  createTournament,
  listParticipants,
  registerParticipant,
  generateGroups,
  getGroups,
  reportGroupMatchResult,
  generateBracket,
  getBracket,
  reportBracketMatchResult,
  getStatus,
  changeStatus,
  listAudit,
};
