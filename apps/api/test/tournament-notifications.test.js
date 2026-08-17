const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'organizer-tournament-result', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

test('la final de un torneo anuncia al campeón mediante notificaciones', async () => {
  const tournament = await request(app).post('/api/tournaments').set(authorization).send({ name: `Copa final ${Date.now()}`, game: 'Valorant', format: 'SINGLE_ELIMINATION', maxTeams: 2 });
  assert.equal(tournament.status, 201);
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(authorization).send({ teamId: 'team-blue', teamName: 'Equipo Azul', seed: 1 });
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(authorization).send({ teamId: 'team-red', teamName: 'Equipo Rojo', seed: 2 });
  const bracket = await request(app).post(`/api/tournaments/${tournament.body.id}/bracket/generate`).set(authorization);
  assert.equal(bracket.status, 201);

  const final = bracket.body[0].matches[0];
  const result = await request(app).put(`/api/tournaments/${tournament.body.id}/bracket-matches/${final.id}/result`).set(authorization).send({ score1: 2, score2: 0 });
  assert.equal(result.status, 200);

  const notifications = await request(app).get('/api/geolocation/notifications');
  assert.ok(notifications.body.some((item) => item.type === 'tournament' && item.message === `${tournament.body.name} tiene campeón: Equipo Azul.`));
});
