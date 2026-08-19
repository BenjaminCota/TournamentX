const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

function managerAuthorization() {
  const token = jwt.sign({ sub: 'captain-teams', role: 'captain' }, process.env.JWT_SECRET || 'development-only-secret');
  return { Authorization: `Bearer ${token}` };
}

function adminAuthorization() {
  const token = jwt.sign({ sub: 'admin-teams', role: 'admin' }, process.env.JWT_SECRET || 'development-only-secret');
  return { Authorization: `Bearer ${token}` };
}

function playerAuthorization(sub) {
  const token = jwt.sign({ sub, role: 'player', name: sub }, process.env.JWT_SECRET || 'development-only-secret');
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
  const tooLongName = await request(app).post('/api/teams').set(authorization).send({ ...teamData, name: 'E'.repeat(61) });
  assert.equal(tooLongName.status, 400);
  const teamResponse = await request(app).post('/api/teams').set(authorization).send(teamData);
  assert.equal(teamResponse.status, 201);
  assert.equal(teamResponse.body.name, 'Atlas Esports');
  assert.equal(teamResponse.body.captainUserId, 'captain-teams');

  const organizer = { Authorization: `Bearer ${jwt.sign({ sub: 'organizer-teams', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };
  const organizerCreate = await request(app).post('/api/teams').set(organizer).send({ ...teamData, name: 'Equipo sin capitán', abbreviation: 'SCP' });
  assert.equal(organizerCreate.status, 403);

  const playerAuth = playerAuthorization('player-teams-1');
  const playerResponse = await request(app).post('/api/players').set(playerAuth).send({
    name: 'Carlos', lastname: 'Hernández', nickname: `CarlosX-${Date.now()}`, avatar: 'https://example.com/player.png', sport: 'Valorant', position: 'Duelista', nationality: 'MX', status: 'active',
  });
  assert.equal(playerResponse.status, 201);

  const duplicatedProfile = await request(app).post('/api/players').set(playerAuth).send({
    name: 'Perfil', lastname: 'Duplicado', nickname: `Duplicado-${Date.now()}`, sport: 'Valorant', position: 'Jugador', nationality: 'MX', status: 'active',
  });
  assert.equal(duplicatedProfile.status, 409);

  const foreignOrganizerRoster = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(organizer).send({ playerId: playerResponse.body.id, role: 'Capitán', status: 'active' });
  assert.equal(foreignOrganizerRoster.status, 403);

  const addMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: playerResponse.body.id, role: 'Capitán', status: 'active' });
  assert.equal(addMember.status, 201);

  const duplicateMember = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: playerResponse.body.id, role: 'Capitán', status: 'active' });
  assert.equal(duplicateMember.status, 409);

  const teamDetail = await request(app).get(`/api/teams/${teamResponse.body.id}`);
  assert.equal(teamDetail.status, 200);
  assert.equal(teamDetail.body.roster.length, 2);

  const removeCaptain = await request(app).delete(`/api/teams/${teamResponse.body.id}/roster/${teamDetail.body.roster.find((member) => member.playerId !== playerResponse.body.id).playerId}`).set(authorization);
  assert.equal(removeCaptain.status, 409);

  const removeMember = await request(app).delete(`/api/teams/${teamResponse.body.id}/roster/${playerResponse.body.id}`).set(authorization);
  assert.equal(removeMember.status, 200);
  assert.equal(removeMember.body.status, 'inactive');

  const deletablePlayer = await request(app).post('/api/players').set(playerAuthorization('player-teams-2')).send({
    name: 'Lucía', lastname: 'Torres', nickname: `Delete-${Date.now()}`, avatar: 'https://example.com/delete-player.png', sport: 'Valorant', position: 'Controladora', nationality: 'MX', status: 'active',
  });
  assert.equal(deletablePlayer.status, 201);
  const activeMembership = await request(app).post(`/api/teams/${teamResponse.body.id}/roster`).set(authorization).send({ playerId: deletablePlayer.body.id, role: 'Jugadora', status: 'active' });
  assert.equal(activeMembership.status, 201);

  const unauthenticatedDelete = await request(app).delete(`/api/players/${deletablePlayer.body.id}`);
  assert.equal(unauthenticatedDelete.status, 401);
  const forbiddenDelete = await request(app).delete(`/api/players/${deletablePlayer.body.id}`).set(authorization);
  assert.equal(forbiddenDelete.status, 403);
  const deleted = await request(app).delete(`/api/players/${deletablePlayer.body.id}`).set(adminAuthorization());
  assert.equal(deleted.status, 204);
  const deletedDetail = await request(app).get(`/api/players/${deletablePlayer.body.id}`);
  assert.equal(deletedDetail.status, 404);
  const teamWithoutDeletedPlayer = await request(app).get(`/api/teams/${teamResponse.body.id}`);
  assert.equal(teamWithoutDeletedPlayer.body.roster.some((member) => member.playerId === deletablePlayer.body.id), false);
});

test('solo un administrador puede dar de baja un equipo', async () => {
  const team = await request(app).post('/api/teams').set(managerAuthorization()).send({
    name: `Equipo baja ${Date.now()}`, abbreviation: `DB${Date.now().toString().slice(-5)}`,
    sport: 'Valorant', region: 'LATAM', competitionType: 'Pruebas', description: '', status: 'active',
  });
  assert.equal(team.status, 201);
  assert.equal((await request(app).delete(`/api/teams/${team.body.id}`).set(managerAuthorization())).status, 403);
  const dissolved = await request(app).delete(`/api/teams/${team.body.id}`).set(adminAuthorization());
  assert.equal(dissolved.status, 200);
  assert.equal(dissolved.body.status, 'inactive');
});
