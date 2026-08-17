const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const authorization = { Authorization: `Bearer ${jwt.sign({ sub: 'manager-tournaments', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

async function createTournamentWithParticipants(format, count, extra = {}) {
  const created = await request(app).post('/api/tournaments').set(authorization).send({ name: `Torneo de prueba ${Date.now()}`, game: 'Valorant', format, maxTeams: count, ...extra });
  assert.equal(created.status, 201);
  const tournamentId = created.body.id;
  for (let i = 1; i <= count; i += 1) {
    await request(app).post(`/api/tournaments/${tournamentId}/participants`).set(authorization).send({ teamId: `team-${i}`, teamName: `Equipo ${i}`, seed: i });
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
