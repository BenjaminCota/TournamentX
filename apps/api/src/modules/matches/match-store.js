const crypto = require('node:crypto');
const database = require('../../config/database');
const env = require('../../config/env');
const HttpError = require('../../utils/http-error');

const matches = [
  {
    id: 'match-201', scheduleId: 'schedule-01', tournamentId: 'tour-1', roundId: 'round-2',
    team1Id: 'team-lnx', team2Id: 'team-titans', scheduledAt: '2026-08-20T18:00:00.000Z',
    venue: 'Arena CDMX', mode: 'best_of_3', status: 'scheduled', score: { team1: 0, team2: 0 },
    streamUrl: null, createdAt: '2026-08-15T18:00:00.000Z', updatedAt: '2026-08-15T18:00:00.000Z',
  },
];

const selectMatch = `SELECT id, schedule_id AS "scheduleId", tournament_id AS "tournamentId", round_id AS "roundId",
  team1_id AS "team1Id", team2_id AS "team2Id", scheduled_at AS "scheduledAt", venue, mode, status,
  score_team1 AS "scoreTeam1", score_team2 AS "scoreTeam2", stream_url AS "streamUrl",
  created_at AS "createdAt", updated_at AS "updatedAt" FROM matches`;

function databaseEnabled() { return Boolean(env.databaseUrl); }
function serialize(match) { return { ...match, score: { ...match.score } }; }
function toSqlDate(value) { return new Date(value).toISOString().slice(0, 23).replace('T', ' '); }
function toIso(value) { return value instanceof Date ? value.toISOString() : new Date(`${value}Z`).toISOString(); }
function mapRow(row) {
  return { ...row, scheduledAt: toIso(row.scheduledAt), createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt), score: { team1: row.scoreTeam1, team2: row.scoreTeam2 } };
}

async function listMatches(filters = {}) {
  if (!databaseEnabled()) {
    return matches.filter((match) => !filters.tournamentId || match.tournamentId === filters.tournamentId)
      .filter((match) => !filters.scheduleId || match.scheduleId === filters.scheduleId)
      .filter((match) => !filters.status || match.status === filters.status)
      .filter((match) => !filters.from || match.scheduledAt >= filters.from)
      .filter((match) => !filters.to || match.scheduledAt <= filters.to)
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)).map(serialize);
  }

  const where = [];
  const params = [];
  for (const [column, value] of Object.entries({ tournament_id: filters.tournamentId, schedule_id: filters.scheduleId, status: filters.status })) {
    if (value) { params.push(value); where.push(`${column} = $${params.length}`); }
  }
  if (filters.from) { params.push(toSqlDate(filters.from)); where.push(`scheduled_at >= $${params.length}`); }
  if (filters.to) { params.push(toSqlDate(filters.to)); where.push(`scheduled_at <= $${params.length}`); }
  const result = await database.query(`${selectMatch}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY scheduled_at ASC`, params);
  return result.rows.map(mapRow);
}

async function getMatch(matchId) {
  if (!databaseEnabled()) {
    const match = matches.find((entry) => entry.id === matchId);
    return match ? serialize(match) : null;
  }
  const result = await database.query(`${selectMatch} WHERE id = $1`, [matchId]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function createMatch({ scheduleId, tournamentId, roundId, team1Id, team2Id, scheduledAt, venue, mode, streamUrl }, client) {
  const now = new Date().toISOString();
  const match = {
    id: crypto.randomUUID(), scheduleId: scheduleId || null, tournamentId, roundId: roundId || null,
    team1Id, team2Id, scheduledAt: scheduledAt.toISOString(), venue: venue || null, mode: mode || 'best_of_1',
    status: 'scheduled', score: { team1: 0, team2: 0 }, streamUrl: streamUrl || null, createdAt: now, updatedAt: now,
  };
  if (!databaseEnabled()) { matches.push(match); return serialize(match); }

  const executor = client || database;
  await executor.query(
    `INSERT INTO matches (id, schedule_id, tournament_id, round_id, team1_id, team2_id, scheduled_at, venue, mode, status, score_team1, score_team2, stream_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [match.id, match.scheduleId, match.tournamentId, match.roundId, match.team1Id, match.team2Id, toSqlDate(match.scheduledAt), match.venue, match.mode, match.status, 0, 0, match.streamUrl],
  );
  return match;
}

function canTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  return {
    scheduled: ['live', 'postponed', 'cancelled'],
    live: ['completed'],
    postponed: ['scheduled', 'cancelled'],
    completed: [],
    cancelled: [],
  }[currentStatus].includes(nextStatus);
}

async function updateMatchScore(matchId, { team1Score, team2Score, status }) {
  const current = await getMatch(matchId);
  if (!current) return null;

  const nextStatus = status || current.status;
  const scoreChanged = team1Score !== undefined || team2Score !== undefined;
  if (!canTransition(current.status, nextStatus)) {
    throw new HttpError(409, `No se puede cambiar un partido de ${current.status} a ${nextStatus}`);
  }
  if (scoreChanged && ['completed', 'cancelled'].includes(current.status)) {
    throw new HttpError(409, 'No se puede modificar el marcador de un partido finalizado o cancelado');
  }
  if (scoreChanged && !['live', 'completed'].includes(nextStatus)) {
    throw new HttpError(409, 'El marcador solo puede actualizarse cuando el partido está en vivo o se finaliza');
  }

  const score = {
    team1: team1Score === undefined ? current.score.team1 : team1Score,
    team2: team2Score === undefined ? current.score.team2 : team2Score,
  };
  if (!databaseEnabled()) {
    const match = matches.find((entry) => entry.id === matchId);
    Object.assign(match, { status: nextStatus, score, updatedAt: new Date().toISOString() });
    return serialize(match);
  }

  await database.query(
    'UPDATE matches SET score_team1 = $1, score_team2 = $2, status = $3 WHERE id = $4',
    [score.team1, score.team2, nextStatus, matchId],
  );
  return getMatch(matchId);
}

module.exports = { databaseEnabled, listMatches, getMatch, createMatch, updateMatchScore };
