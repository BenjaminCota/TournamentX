const crypto = require('node:crypto');
const HttpError = require('../../utils/http-error');
const database = require('../../config/database');
const matchStore = require('./match-store');
const localStore = require('../../config/local-store');

const schedulesSeed = [
  { id: 'schedule-01', tournamentId: 'tour-1', startsAt: '2026-08-20T18:00:00.000Z', endsAt: '2026-08-20T19:30:00.000Z', status: 'published', format: 'single_elimination', createdAt: '2026-08-15T18:00:00.000Z', updatedAt: '2026-08-15T18:00:00.000Z' },
];
const schedules = localStore.collection('schedules', schedulesSeed);

const selectSchedule = `SELECT id, tournament_id AS "tournamentId", starts_at AS "startsAt", ends_at AS "endsAt", status, format,
  created_at AS "createdAt", updated_at AS "updatedAt" FROM schedules`;

function toSqlDate(value) { return new Date(value).toISOString().slice(0, 23).replace('T', ' '); }
function toIso(value) { return value instanceof Date ? value.toISOString() : new Date(`${value}Z`).toISOString(); }
function mapRow(row) { return { ...row, startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt), createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) }; }

async function serialize(schedule, includeMatches = false) {
  const value = { ...schedule };
  if (includeMatches) value.matches = await matchStore.listMatches({ scheduleId: schedule.id });
  return value;
}

function createPairings(teamIds, format) {
  if (format === 'round_robin') return teamIds.flatMap((team1Id, firstIndex) => teamIds.slice(firstIndex + 1).map((team2Id) => ({ team1Id, team2Id, roundId: 'round-robin' })));
  return teamIds.reduce((pairings, team1Id, index) => {
    if (index % 2 === 0) pairings.push({ team1Id, team2Id: teamIds[index + 1], roundId: 'round-1' });
    return pairings;
  }, []);
}

async function listSchedules(filters = {}) {
  if (!matchStore.databaseEnabled()) return Promise.all(schedules.filter((schedule) => !filters.tournamentId || schedule.tournamentId === filters.tournamentId).map((schedule) => serialize(schedule)));
  const result = filters.tournamentId
    ? await database.query(`${selectSchedule} WHERE tournament_id = $1 ORDER BY starts_at ASC`, [filters.tournamentId])
    : await database.query(`${selectSchedule} ORDER BY starts_at ASC`);
  return result.rows.map(mapRow);
}

async function getSchedule(scheduleId) {
  if (!matchStore.databaseEnabled()) {
    const schedule = schedules.find((entry) => entry.id === scheduleId);
    return schedule ? serialize(schedule, true) : null;
  }
  const result = await database.query(`${selectSchedule} WHERE id = $1`, [scheduleId]);
  return result.rows[0] ? serialize(mapRow(result.rows[0]), true) : null;
}

async function createSchedule({ tournamentId, teamIds, startsAt, endsAt, slotMinutes, venue, mode, format }) {
  const pairings = createPairings(teamIds, format);
  const startTime = startsAt.getTime();
  const computedEnd = new Date(startTime + (pairings.length * slotMinutes * 60 * 1000));
  if (endsAt && computedEnd > endsAt) throw new HttpError(400, 'El calendario no cabe dentro del rango de fechas indicado');

  const now = new Date().toISOString();
  const schedule = { id: crypto.randomUUID(), tournamentId, startsAt: startsAt.toISOString(), endsAt: (endsAt || computedEnd).toISOString(), status: 'published', format, createdAt: now, updatedAt: now };
  const createMatches = async (client) => {
    const generatedMatches = [];
    for (const [index, pairing] of pairings.entries()) {
      generatedMatches.push(await matchStore.createMatch({
        scheduleId: schedule.id, tournamentId, roundId: pairing.roundId, team1Id: pairing.team1Id, team2Id: pairing.team2Id,
        scheduledAt: new Date(startTime + (index * slotMinutes * 60 * 1000)), venue, mode,
      }, client));
    }
    return generatedMatches;
  };

  if (!matchStore.databaseEnabled()) {
    schedules.push(schedule);
    localStore.saveCollection('schedules', schedules);
    await createMatches();
    return getSchedule(schedule.id);
  }

  return database.transaction(async (client) => {
    await client.query('INSERT INTO schedules (id, tournament_id, starts_at, ends_at, status, format) VALUES ($1,$2,$3,$4,$5,$6)', [schedule.id, schedule.tournamentId, toSqlDate(schedule.startsAt), toSqlDate(schedule.endsAt), schedule.status, schedule.format]);
    const generatedMatches = await createMatches(client);
    return { ...schedule, matches: generatedMatches };
  });
}

module.exports = { listSchedules, getSchedule, createSchedule };
