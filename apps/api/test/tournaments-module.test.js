const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'manager-tournaments', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };
const adminAuthorization = { Authorization: `Bearer ${jwt.sign({ sub: 'admin-tournaments', role: 'admin' }, process.env.JWT_SECRET || 'development-only-secret')}` };

async function activeTeamIds(count) {
  const ids = ['team-lnx', 'team-titans'];
  const marker = Date.now().toString(36).slice(-5);
  for (let index = ids.length; index < count; index += 1) {
    const created = await request(app).post('/api/teams').set(authorization).send({
      name: `Equipo torneo ${marker}-${index}`, abbreviation: `T${marker}${index}`, sport: 'Valorant', region: 'LATAM', competitionType: 'Pruebas', description: '', status: 'active',
    });
    assert.equal(created.status, 201);
    ids.push(created.body.id);
  }
  return ids.slice(0, count);
}

async function createTournamentWithParticipants(format, count, extra = {}) {
  const created = await request(app).post('/api/tournaments').set(authorization).send({ name: `Torneo de prueba ${Date.now()}`, game: 'Valorant', format, maxTeams: count, ...extra });
  assert.equal(created.status, 201);
  const tournamentId = created.body.id;
  const teamIds = await activeTeamIds(count);
  for (let i = 1; i <= count; i += 1) {
    await request(app).post(`/api/tournaments/${tournamentId}/participants`).set(authorization).send({ teamId: teamIds[i - 1], teamName: `Equipo ${i}`, seed: i });
  }
  return tournamentId;
}

test('Dev 2 protege la creación de torneos y expone el estado de la API', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  const denied = await request(app).post('/api/tournaments').send({ name: 'Copa privada', game: 'Rocket League' });
  assert.equal(denied.status, 401);
  const created = await request(app).post('/api/tournaments').set(authorization).send({ name: 'Copa Demo', game: 'Rocket League' });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'OPEN');
  const missingTeam = await request(app).post(`/api/tournaments/${created.body.id}/participants`).set(authorization).send({ teamId: 'team-missing', teamName: 'No existe', seed: 1 });
  assert.equal(missingTeam.status, 404);
});

test('rechaza nombres de torneo que exceden el límite de texto', async () => {
  const response = await request(app).post('/api/tournaments').set(authorization).send({ name: '2'.repeat(121), game: 'Valorant' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /120 caracteres/);
});

test('solo el administrador puede dar de baja un torneo activo', async () => {
  const created = await request(app).post('/api/tournaments').set(authorization).send({ name: 'Torneo cancelable', game: 'Valorant' });
  assert.equal(created.status, 201);

  const denied = await request(app).patch(`/api/tournaments/${created.body.id}/status`).set(authorization).send({ status: 'CANCELLED' });
  assert.equal(denied.status, 403);

  const cancelled = await request(app).patch(`/api/tournaments/${created.body.id}/status`).set(adminAuthorization).send({ status: 'CANCELLED' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.tournament.status, 'CANCELLED');
});

test('genera y resuelve un bracket de eliminación directa con avance de rondas', async () => {
  const tournamentId = await createTournamentWithParticipants('SINGLE_ELIMINATION', 3);
  const generated = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`).set(authorization);
  assert.equal(generated.status, 201);
  const openMatch = generated.body[0].matches.find((match) => match.status === 'SCHEDULED');
  const result = await request(app).put(`/api/tournaments/${tournamentId}/bracket-matches/${openMatch.id}/result`).set(authorization).send({ score1: 2, score2: 1 });
  assert.equal(result.status, 200);
  const bracket = await request(app).get(`/api/tournaments/${tournamentId}/bracket`);
  const final = bracket.body[1].matches[0];
  const tie = await request(app).put(`/api/tournaments/${tournamentId}/bracket-matches/${final.id}/result`).set(authorization).send({ score1: 1, score2: 1 });
  assert.equal(tie.status, 400);
  const finished = await request(app).put(`/api/tournaments/${tournamentId}/bracket-matches/${final.id}/result`).set(authorization).send({ score1: 3, score2: 0 });
  assert.equal(finished.status, 200);
  const status = await request(app).get(`/api/tournaments/${tournamentId}/status`);
  assert.equal(status.body.status, 'COMPLETED');
});

test('genera grupos, calcula posiciones y arma el bracket con los mejores de cada grupo', async () => {
  const tournamentId = await createTournamentWithParticipants('GROUP_STAGE_PLAYOFFS', 4, { groupAdvanceCount: 1 });
  const groups = await request(app).post(`/api/tournaments/${tournamentId}/groups/generate`).set(authorization).send({ groupCount: 2 });
  assert.equal(groups.status, 201);
  const blockedBracket = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`).set(authorization);
  assert.equal(blockedBracket.status, 409);
  for (const group of groups.body) for (const match of group.matches) await request(app).put(`/api/tournaments/${tournamentId}/group-matches/${match.id}/result`).set(authorization).send({ score1: 2, score2: 0 });
  const bracket = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`).set(authorization);
  assert.equal(bracket.status, 201);
});
