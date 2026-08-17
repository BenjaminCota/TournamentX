const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const managerAuthorization = { Authorization: `Bearer ${jwt.sign({ sub: 'manager-matches', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret')}` };

async function createTournamentWithTeams(teamIds) {
  const tournament = await request(app).post('/api/tournaments').set(managerAuthorization).send({
    name: `Torneo de partidos ${Date.now()}-${Math.random()}`,
    game: 'Valorant',
    format: 'SINGLE_ELIMINATION',
    maxTeams: teamIds.length,
  });
  assert.equal(tournament.status, 201);

  for (const [index, teamId] of teamIds.entries()) {
    const participant = await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(managerAuthorization).send({
      teamId,
      seed: index + 1,
    });
    assert.equal(participant.status, 201);
  }
  return tournament.body.id;
}

test('Dev 4 expone y filtra partidos programados', async () => {
  const response = await request(app).get('/api/matches?tournamentId=tour-1&status=scheduled');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.some((match) => match.id === 'match-201'));
});

test('Dev 4 crea un partido y permite consultarlo', async () => {
  const tournamentId = await createTournamentWithTeams(['team-lnx', 'team-titans']);
  const created = await request(app).post('/api/matches').set(managerAuthorization).send({
    tournamentId,
    scheduleId: 'schedule-02',
    roundId: 'round-1',
    team1Id: 'team-lnx',
    team2Id: 'team-titans',
    scheduledAt: '2026-08-21T19:00:00.000Z',
    venue: 'Lobby MX-01',
    mode: 'best_of_3',
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'scheduled');
  assert.deepEqual(created.body.score, { team1: 0, team2: 0 });

  const detail = await request(app).get(`/api/matches/${created.body.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.tournamentId, tournamentId);
});

test('Dev 4 valida partidos y devuelve 404 para IDs desconocidos', async () => {
  const invalid = await request(app).post('/api/matches').set(managerAuthorization).send({
    tournamentId: 'tour-1',
    team1Id: 'team-lnx',
    team2Id: 'team-lnx',
    scheduledAt: '2026-08-21T19:00:00.000Z',
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /datos de entrada inválidos/i);

  const missing = await request(app).get('/api/matches/unknown-match');
  assert.equal(missing.status, 404);
  assert.match(missing.body.error, /partido no encontrado/i);
});

test('Dev 4 genera un calendario todos-contra-todos con sus partidos', async () => {
  const thirdTeam = await request(app).post('/api/teams').set(managerAuthorization).send({
    name: `Equipo calendario ${Date.now()}`, abbreviation: `C${Date.now().toString(36).slice(-5)}`, sport: 'Valorant', region: 'LATAM', competitionType: 'Pruebas', description: '', status: 'active',
  });
  assert.equal(thirdTeam.status, 201);
  const tournamentId = await createTournamentWithTeams(['team-lnx', 'team-titans', thirdTeam.body.id]);
  const created = await request(app).post('/api/schedules').set(managerAuthorization).send({
    tournamentId,
    teamIds: ['team-lnx', 'team-titans', thirdTeam.body.id],
    startsAt: '2026-08-22T18:00:00.000Z',
    endsAt: '2026-08-22T21:00:00.000Z',
    slotMinutes: 60,
    venue: 'Arena Universitaria',
    mode: 'best_of_3',
    format: 'round_robin',
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'published');
  assert.equal(created.body.matches.length, 3);
  assert.deepEqual(created.body.matches.map((match) => match.scheduledAt), [
    '2026-08-22T18:00:00.000Z',
    '2026-08-22T19:00:00.000Z',
    '2026-08-22T20:00:00.000Z',
  ]);

  const detail = await request(app).get(`/api/schedules/${created.body.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.matches.length, 3);
});

test('Dev 4 rechaza una eliminación directa sin equipos potencia de dos', async () => {
  const invalid = await request(app).post('/api/schedules').set(managerAuthorization).send({
    tournamentId: 'tour-4',
    teamIds: ['team-lnx', 'team-titans', 'team-orbit'],
    startsAt: '2026-08-22T18:00:00.000Z',
    format: 'single_elimination',
  });

  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /datos de entrada inválidos/i);
});

test('Dev 4 protege y actualiza el marcador con transiciones válidas', async () => {
  const tournamentId = await createTournamentWithTeams(['team-lnx', 'team-titans']);
  const created = await request(app).post('/api/matches').set(managerAuthorization).send({
    tournamentId,
    team1Id: 'team-lnx',
    team2Id: 'team-titans',
    scheduledAt: '2026-08-23T18:00:00.000Z',
  });
  const token = jwt.sign({ sub: 'referee-1', role: 'referee' }, process.env.JWT_SECRET || 'development-only-secret');

  const unauthenticated = await request(app).patch(`/api/matches/${created.body.id}/score`).send({ status: 'live' });
  assert.equal(unauthenticated.status, 401);

  const live = await request(app).patch(`/api/matches/${created.body.id}/score`)
    .set('Authorization', `Bearer ${token}`)
    .send({ team1Score: 2, team2Score: 1, status: 'live' });
  assert.equal(live.status, 200);
  assert.equal(live.body.status, 'live');
  assert.deepEqual(live.body.score, { team1: 2, team2: 1 });

  const completed = await request(app).patch(`/api/matches/${created.body.id}/score`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'completed' });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.status, 'completed');

  const afterCompletion = await request(app).patch(`/api/matches/${created.body.id}/score`)
    .set('Authorization', `Bearer ${token}`)
    .send({ team1Score: 3, team2Score: 1 });
  assert.equal(afterCompletion.status, 409);
});
