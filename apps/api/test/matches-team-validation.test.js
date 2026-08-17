const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'organizer-match-validation', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

test('partidos y calendarios rechazan equipos inexistentes', async () => {
  const match = await request(app).post('/api/matches').set(authorization).send({
    tournamentId: 'tour-validation', team1Id: 'team-lnx', team2Id: 'team-missing', scheduledAt: '2026-09-02T18:00:00.000Z',
  });
  assert.equal(match.status, 404);

  const schedule = await request(app).post('/api/schedules').set(authorization).send({
    tournamentId: 'tour-validation', teamIds: ['team-lnx', 'team-missing'], startsAt: '2026-09-02T18:00:00.000Z', format: 'round_robin',
  });
  assert.equal(schedule.status, 404);
});
