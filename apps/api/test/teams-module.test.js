const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

function managerAuthorization() {
  const token = jwt.sign({ sub: 'manager-teams', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret');
  return { Authorization: `Bearer ${token}` };
}

test('Dev 3 protege la escritura y gestiona equipos, jugadores y roster', async () => {
  const teamsList = await request(app).get('/api/teams');
  assert.equal(teamsList.status, 200);
  assert.ok(Array.isArray(teamsList.body));

  const teamData = { name: 'Atlas Esports', abbreviation: 'ATL', logo: 'https://example.com/logo.png', sport: 'Valorant', region: 'LATAM', competitionType: 'Regional', description: 'Equipo de prueba del módulo Dev 3.', status: 'active' };
  const unauthenticated = await request(app).post('/api/teams').send(teamData);
  assert.equal(unauthenticated.status, 401);

  const authorization = managerAuthorization();
  const teamResponse = await request(app).post('/api/teams').set(authorization).send(teamData);
  assert.equal(teamResponse.status, 201);
  assert.equal(teamResponse.body.name, 'Atlas Esports');

  const playerResponse = await request(app).post('/api/players').set(authorization).send({
    name: 'Carlos', lastname: 'Hernández', nickname: `CarlosX-${Date.now()}`, avatar: 'https://example.com/player.png', sport: 'Valorant', position: 'Duelista', nationality: 'MX', status: 'active',
  });
  assert.equal(playerResponse.status, 201);

  const addMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: playerResponse.body.id, role: 'Capitán', status: 'active' });
  assert.equal(addMember.status, 201);

  const duplicateMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: playerResponse.body.id, role: 'Capitán', status: 'active' });
  assert.equal(duplicateMember.status, 409);

  const teamDetail = await request(app).get(`/api/teams/${teamResponse.body.id}`);
  assert.equal(teamDetail.status, 200);
  assert.equal(teamDetail.body.roster.length, 1);

  const removeMember = await request(app).delete(`/api/teams/${teamResponse.body.id}/roster/${playerResponse.body.id}`).set(authorization);
  assert.equal(removeMember.status, 200);
  assert.equal(removeMember.body.status, 'inactive');

  const deletablePlayer = await request(app).post('/api/players').set(authorization).send({
    name: 'Lucía', lastname: 'Torres', nickname: `Delete-${Date.now()}`, avatar: 'https://example.com/delete-player.png', sport: 'Valorant', position: 'Controladora', nationality: 'MX', status: 'active',
  });
  assert.equal(deletablePlayer.status, 201);
  const activeMembership = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: deletablePlayer.body.id, role: 'Jugadora', status: 'active' });
  assert.equal(activeMembership.status, 201);

  const unauthenticatedDelete = await request(app).delete(`/api/players/${deletablePlayer.body.id}`);
  assert.equal(unauthenticatedDelete.status, 401);
  const deleted = await request(app).delete(`/api/players/${deletablePlayer.body.id}`).set(authorization);
  assert.equal(deleted.status, 204);
  const deletedDetail = await request(app).get(`/api/players/${deletablePlayer.body.id}`);
  assert.equal(deletedDetail.status, 404);
  const teamWithoutDeletedPlayer = await request(app).get(`/api/teams/${teamResponse.body.id}`);
  assert.equal(teamWithoutDeletedPlayer.body.roster.some((member) => member.playerId === deletablePlayer.body.id), false);
});
