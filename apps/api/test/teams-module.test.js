const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('Dev 3 expone equipos y jugadores con relaciones de roster', async () => {
  const teamsList = await request(app).get('/api/teams');
  assert.equal(teamsList.status, 200);
  assert.ok(Array.isArray(teamsList.body));

  const teamResponse = await request(app).post('/api/teams').send({
    name: 'Atlas Esports',
    abbreviation: 'ATL',
    logo: 'https://example.com/logo.png',
    sport: 'Valorant',
    region: 'LATAM',
    competitionType: 'Regional',
    description: 'Equipo de prueba del módulo Dev 3.',
    status: 'active'
  });

  assert.equal(teamResponse.status, 201);
  assert.equal(teamResponse.body.name, 'Atlas Esports');

  const playerResponse = await request(app).post('/api/players').send({
    name: 'Carlos',
    lastname: 'Hernández',
    nickname: 'CarlosX',
    avatar: 'https://example.com/player.png',
    sport: 'Valorant',
    position: 'Duelista',
    nationality: 'MX',
    status: 'active'
  });

  assert.equal(playerResponse.status, 201);
  assert.equal(playerResponse.body.nickname, 'CarlosX');

  const addMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).send({
    playerId: playerResponse.body.id,
    role: 'Capitán',
    status: 'active'
  });

  assert.equal(addMember.status, 201);
  assert.equal(addMember.body.playerId, playerResponse.body.id);

  const duplicateMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).send({
    playerId: playerResponse.body.id,
    role: 'Capitán',
    status: 'active'
  });

  assert.equal(duplicateMember.status, 409);
  assert.match(duplicateMember.body.error || duplicateMember.body.message, /ya pertenece/i);

  const teamDetail = await request(app).get(`/api/teams/${teamResponse.body.id}`);
  assert.equal(teamDetail.status, 200);
  assert.equal(teamDetail.body.roster.length, 1);

  const removeMember = await request(app).delete(`/api/teams/${teamResponse.body.id}/roster/${playerResponse.body.id}`);
  assert.equal(removeMember.status, 200);
  assert.equal(removeMember.body.status, 'inactive');
});
