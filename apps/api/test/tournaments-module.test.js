const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

async function createTournamentWithParticipants(format, count, extra = {}) {
  const created = await request(app).post('/api/tournaments').send({
    name: 'Torneo de prueba',
    game: 'Valorant',
    format,
    maxTeams: count,
    ...extra,
  });
  const tournamentId = created.body.id;
  for (let i = 1; i <= count; i += 1) {
    await request(app).post(`/api/tournaments/${tournamentId}/participants`).send({
      teamId: `team-${i}`,
      teamName: `Equipo ${i}`,
      seed: i,
    });
  }
  return tournamentId;
}

test('Dev 2 crea un torneo y expone el estado de la API', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);

  const created = await request(app).post('/api/tournaments').send({ name: 'Copa Demo', game: 'Rocket League' });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, 'Copa Demo');
  assert.equal(created.body.status, 'OPEN');

  const listed = await request(app).get('/api/tournaments');
  assert.equal(listed.status, 200);
  assert.ok(listed.body.some((tournament) => tournament.id === created.body.id));
});

test('genera y resuelve un bracket de eliminación directa con avance de rondas', async () => {
  const tournamentId = await createTournamentWithParticipants('SINGLE_ELIMINATION', 3);

  const generated = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`);
  assert.equal(generated.status, 201);
  assert.equal(generated.body[0].matches.length, 2);

  const byeMatch = generated.body[0].matches.find((match) => match.status === 'FINISHED');
  const openMatch = generated.body[0].matches.find((match) => match.status === 'SCHEDULED');
  assert.ok(byeMatch);
  assert.ok(openMatch);

  const result = await request(app)
    .put(`/api/tournaments/${tournamentId}/bracket-matches/${openMatch.id}/result`)
    .send({ score1: 2, score2: 1 });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'FINISHED');

  const bracket = await request(app).get(`/api/tournaments/${tournamentId}/bracket`);
  const final = bracket.body[1].matches[0];
  assert.equal(final.status, 'SCHEDULED');
  assert.notEqual(final.team1.id, 'tbd');
  assert.notEqual(final.team2.id, 'tbd');

  const tie = await request(app)
    .put(`/api/tournaments/${tournamentId}/bracket-matches/${final.id}/result`)
    .send({ score1: 1, score2: 1 });
  assert.equal(tie.status, 400);

  const finished = await request(app)
    .put(`/api/tournaments/${tournamentId}/bracket-matches/${final.id}/result`)
    .send({ score1: 3, score2: 0 });
  assert.equal(finished.status, 200);

  const status = await request(app).get(`/api/tournaments/${tournamentId}/status`);
  assert.equal(status.body.status, 'COMPLETED');
  assert.equal(status.body.championId, final.team1.id);
});

test('genera grupos, calcula posiciones y arma el bracket con los mejores de cada grupo', async () => {
  const tournamentId = await createTournamentWithParticipants('GROUP_STAGE_PLAYOFFS', 4, { groupAdvanceCount: 1 });

  const groups = await request(app).post(`/api/tournaments/${tournamentId}/groups/generate`).send({ groupCount: 2 });
  assert.equal(groups.status, 201);
  assert.equal(groups.body.length, 2);

  const blockedBracket = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`);
  assert.equal(blockedBracket.status, 409);

  for (const group of groups.body) {
    for (const match of group.matches) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .put(`/api/tournaments/${tournamentId}/group-matches/${match.id}/result`)
        .send({ score1: 2, score2: 0 });
    }
  }

  const bracket = await request(app).post(`/api/tournaments/${tournamentId}/bracket/generate`);
  assert.equal(bracket.status, 201);
  assert.equal(bracket.body[0].matches.length, 1);
});
