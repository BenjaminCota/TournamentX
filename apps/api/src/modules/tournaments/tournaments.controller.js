const HttpError = require('../../utils/http-error');
const store = require('./tournament-store');
const { publishTournamentChampion } = require('../geolocation/notifications.service');
const { releaseTournamentChampion } = require('../rewards/local-rewards.service');

const MAX_PRIZE_AMOUNT_USD = 1_000_000;

function boundedText(value, label, { min = 0, max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${label} es obligatorio`);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${label} debe ser texto`);
  const normalized = value.trim();
  if (normalized.length < min) throw new HttpError(400, `${label} debe tener al menos ${min} caracteres`);
  if (normalized.length > max) throw new HttpError(400, `${label} no puede superar ${max} caracteres`);
  return normalized;
}

function validTournamentDate(value, label) {
  const date = boundedText(value, label, { required: true, min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new HttpError(400, `${label} debe tener el formato AAAA-MM-DD`);
  }
  return date;
}

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function assertTournamentManager(req, tournamentId) {
  const tournament = store.getTournament(tournamentId);
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'admin') return tournament;
  if (role === 'organizer' && tournament.createdBy === req.user?.sub) return tournament;
  throw new HttpError(403, 'Solo el administrador o el organizador creador puede administrar este torneo');
}

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
    const name = boundedText(req.body.name, 'El nombre del torneo', { required: true, min: 2, max: 60 });
    const game = boundedText(req.body.game, 'El juego o deporte', { required: true, min: 2, max: 80 });
    const description = boundedText(req.body.description, 'La descripción', { max: 300 });
    const venue = boundedText(req.body.venue, 'La sede', { max: 160 });
    const dates = boundedText(req.body.dates, 'Las fechas', { max: 100 });
    const organizer = boundedText(req.body.organizer, 'El organizador', { max: 120 });
    const tier = boundedText(req.body.tier, 'El nivel', { max: 80 });
    const prizePool = boundedText(req.body.prizePool, 'La bolsa de premios', { max: 40 });
    const prizeAmountUSD = req.body.prizeAmountUSD === undefined ? undefined : Number(req.body.prizeAmountUSD);
    if (prizeAmountUSD !== undefined && (!Number.isFinite(prizeAmountUSD) || !Number.isInteger(prizeAmountUSD) || prizeAmountUSD < 1 || prizeAmountUSD > MAX_PRIZE_AMOUNT_USD)) {
      throw new HttpError(400, `El monto de premios debe ser un número entero entre $1 y $${MAX_PRIZE_AMOUNT_USD.toLocaleString('en-US')} USD`);
    }
    const usesCalendarDates = req.body.startDate !== undefined || req.body.endDate !== undefined;
    let calendarDates = {};
    if (usesCalendarDates) {
      const startDate = validTournamentDate(req.body.startDate, 'La fecha de inicio');
      const endDate = validTournamentDate(req.body.endDate, 'La fecha de finalización');
      const startTime = Date.parse(`${startDate}T00:00:00Z`);
      const endTime = Date.parse(`${endDate}T00:00:00Z`);
      if (startTime < startOfTodayUtc()) throw new HttpError(400, 'La fecha de inicio no puede ser anterior a hoy');
      if (endTime <= startTime) throw new HttpError(400, 'La fecha de finalización debe ser posterior a la fecha de inicio');
      calendarDates = { startDate, endDate };
    }
    res.status(201).json(store.createTournament({ ...req.body, name, game, ...calendarDates, ...(description !== undefined ? { description } : {}), ...(venue !== undefined ? { venue } : {}), ...(dates !== undefined ? { dates } : {}), ...(organizer !== undefined ? { organizer } : {}), ...(tier !== undefined ? { tier } : {}), ...(prizePool !== undefined ? { prizePool } : {}), ...(prizeAmountUSD !== undefined ? { prizeAmountUSD } : {}), createdBy: req.user.sub }));
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
    assertTournamentManager(req, req.params.id);
    const { teamId, teamName, seed } = req.body;
    res.status(201).json(store.registerParticipant(req.params.id, { teamId, teamName, seed: Number(seed) }));
  } catch (error) {
    next(error);
  }
}

async function generateGroups(req, res, next) {
  try {
    assertTournamentManager(req, req.params.id);
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
    assertTournamentManager(req, req.params.id);
    const score1 = Number(req.body.score1);
    const score2 = Number(req.body.score2);
    res.json(store.reportGroupMatchResult(req.params.id, req.params.matchId, { score1, score2 }));
  } catch (error) {
    next(error);
  }
}

async function generateBracket(req, res, next) {
  try {
    assertTournamentManager(req, req.params.id);
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
    assertTournamentManager(req, req.params.id);
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
    const allowed = ['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const tournament = assertTournamentManager(req, req.params.id);
    const role = String(req.user.role).toLowerCase();
    const isAdmin = role === 'admin';
    const isOwnerOrganizer = role === 'organizer' && tournament.createdBy === req.user.sub;
    if (!allowed.includes(req.body.status)) throw new HttpError(400, 'Estado de torneo no válido');
    res.json(store.changeStatus(req.params.id, req.body.status, req.user.sub, String(req.body.note || '').slice(0, 500), { forceCancellation: isAdmin || isOwnerOrganizer }));
  } catch (error) { next(error); }
}

async function listAudit(req, res, next) {
  try { assertTournamentManager(req, req.params.id); res.json({ data: store.listAudit(req.params.id) }); } catch (error) { next(error); }
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
