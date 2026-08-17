const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const managerAuthorization = { Authorization: `Bearer ${jwt.sign({ sub: 'manager-notifications', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

test('al finalizar un partido se publica una notificación de resultado', async () => {
  const created = await request(app).post('/api/matches').set(managerAuthorization).send({
    tournamentId: 'tour-notification',
    team1Id: 'team-lnx',
    team2Id: 'team-titans',
    scheduledAt: '2026-09-01T18:00:00.000Z',
  });
  assert.equal(created.status, 201);

  const token = jwt.sign({ sub: 'referee-notification', role: 'referee' }, process.env.JWT_SECRET || 'development-only-secret');
  const authorization = { Authorization: `Bearer ${token}` };
  await request(app).patch(`/api/matches/${created.body.id}/score`).set(authorization).send({ status: 'live' });
  const completed = await request(app).patch(`/api/matches/${created.body.id}/score`).set(authorization).send({ team1Score: 3, team2Score: 1, status: 'completed' });
  assert.equal(completed.status, 200);

  const notifications = await request(app).get('/api/geolocation/notifications');
  assert.ok(notifications.body.some((item) => item.type === 'result' && item.message === 'Partido team-lnx 3 — 1 team-titans.'));
});
