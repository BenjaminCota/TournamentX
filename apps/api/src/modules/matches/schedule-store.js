const crypto = require('node:crypto');
const HttpError = require('../../utils/http-error');
const matchStore = require('./match-store');

const schedules = [
  {
    id: 'schedule-01',
    tournamentId: 'tour-1',
    startsAt: '2026-08-20T18:00:00.000Z',
    endsAt: '2026-08-20T19:30:00.000Z',
    status: 'published',
    format: 'single_elimination',
    createdAt: '2026-08-15T18:00:00.000Z',
    updatedAt: '2026-08-15T18:00:00.000Z',
  },
];

function serialize(schedule, includeMatches = false) {
  const value = { ...schedule };
  if (includeMatches) value.matches = matchStore.listMatches({ scheduleId: schedule.id });
  return value;
}

function createPairings(teamIds, format) {
  if (format === 'round_robin') {
    return teamIds.flatMap((team1Id, firstIndex) => teamIds
      .slice(firstIndex + 1)
      .map((team2Id) => ({ team1Id, team2Id, roundId: 'round-robin' })));
  }

  return teamIds.reduce((pairings, team1Id, index) => {
    if (index % 2 === 0) pairings.push({ team1Id, team2Id: teamIds[index + 1], roundId: 'round-1' });
    return pairings;
  }, []);
}

function listSchedules(filters = {}) {
  return schedules
    .filter((schedule) => !filters.tournamentId || schedule.tournamentId === filters.tournamentId)
    .map((schedule) => serialize(schedule));
}

function getSchedule(scheduleId) {
  const schedule = schedules.find((entry) => entry.id === scheduleId);
  return schedule ? serialize(schedule, true) : null;
}

function createSchedule({ tournamentId, teamIds, startsAt, endsAt, slotMinutes, venue, mode, format }) {
  const pairings = createPairings(teamIds, format);
  const startTime = startsAt.getTime();
  const computedEnd = new Date(startTime + (pairings.length * slotMinutes * 60 * 1000));

  if (endsAt && computedEnd > endsAt) {
    throw new HttpError(400, 'El calendario no cabe dentro del rango de fechas indicado');
  }

  const now = new Date().toISOString();
  const schedule = {
    id: crypto.randomUUID(),
    tournamentId,
    startsAt: startsAt.toISOString(),
    endsAt: (endsAt || computedEnd).toISOString(),
    status: 'published',
    format,
    createdAt: now,
    updatedAt: now,
  };

  schedules.push(schedule);
  pairings.forEach((pairing, index) => {
    matchStore.createMatch({
      scheduleId: schedule.id,
      tournamentId,
      roundId: pairing.roundId,
      team1Id: pairing.team1Id,
      team2Id: pairing.team2Id,
      scheduledAt: new Date(startTime + (index * slotMinutes * 60 * 1000)),
      venue,
      mode,
    });
  });

  return getSchedule(schedule.id);
}

module.exports = { listSchedules, getSchedule, createSchedule };
