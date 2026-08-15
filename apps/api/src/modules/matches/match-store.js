const crypto = require('node:crypto');

const matches = [
  {
    id: 'match-201',
    scheduleId: 'schedule-01',
    tournamentId: 'tour-1',
    roundId: 'round-2',
    team1Id: 'team-lnx',
    team2Id: 'team-titans',
    scheduledAt: '2026-08-20T18:00:00.000Z',
    venue: 'Arena CDMX',
    mode: 'best_of_3',
    status: 'scheduled',
    score: { team1: 0, team2: 0 },
    streamUrl: null,
    createdAt: '2026-08-15T18:00:00.000Z',
    updatedAt: '2026-08-15T18:00:00.000Z',
  },
];

function serialize(match) {
  return { ...match, score: { ...match.score } };
}

function listMatches(filters = {}) {
  return matches
    .filter((match) => !filters.tournamentId || match.tournamentId === filters.tournamentId)
    .filter((match) => !filters.scheduleId || match.scheduleId === filters.scheduleId)
    .filter((match) => !filters.status || match.status === filters.status)
    .filter((match) => !filters.from || match.scheduledAt >= filters.from)
    .filter((match) => !filters.to || match.scheduledAt <= filters.to)
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
    .map(serialize);
}

function getMatch(matchId) {
  const match = matches.find((entry) => entry.id === matchId);
  return match ? serialize(match) : null;
}

function createMatch({ scheduleId, tournamentId, roundId, team1Id, team2Id, scheduledAt, venue, mode, streamUrl }) {
  const now = new Date().toISOString();
  const match = {
    id: crypto.randomUUID(),
    scheduleId: scheduleId || null,
    tournamentId,
    roundId: roundId || null,
    team1Id,
    team2Id,
    scheduledAt: scheduledAt.toISOString(),
    venue: venue || null,
    mode: mode || 'best_of_1',
    status: 'scheduled',
    score: { team1: 0, team2: 0 },
    streamUrl: streamUrl || null,
    createdAt: now,
    updatedAt: now,
  };
  matches.push(match);
  return serialize(match);
}

module.exports = { listMatches, getMatch, createMatch };
