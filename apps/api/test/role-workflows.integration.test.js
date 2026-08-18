const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const secret = process.env.JWT_SECRET || 'development-only-secret';
const authorization = (sub, role) => ({ Authorization: `Bearer ${jwt.sign({ sub, role }, secret)}` });

test('un jugador solicita ser organizador y el administrador aprueba la solicitud', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const registered = await request(app).post('/api/auth/register').send({ name: 'Nuevo organizador', email: `organizer-request-${suffix}@example.test`, password: 'Password123!' });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.role, 'player');

  const created = await request(app).post('/api/auth/organizer-requests')
    .set('Authorization', `Bearer ${registered.body.token}`)
    .send({ organizationName: 'Liga Universitaria', description: 'Torneos universitarios', credentialReference: `credential-${suffix}`, socialLinks: { website: 'https://example.test/liga' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.request.status, 'PENDING');

  const admin = await request(app).post('/api/auth/login').send({ email: 'admin@tournamentx.local', password: 'Admin123!' });
  const approved = await request(app).patch(`/api/auth/organizer-requests/${created.body.request.id}`)
    .set('Authorization', `Bearer ${admin.body.token}`)
    .send({ decision: 'approve', reviewNote: 'Credencial revisada' });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.request.status, 'APPROVED');
  assert.equal(approved.body.request.applicant.role, 'organizer');
});

test('el capitÃ¡n crea su equipo, invita y aprueba el ingreso de un jugador', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const captainId = `captain-${suffix}`;
  const playerId = `user-player-${suffix}`;
  const captain = authorization(captainId, 'captain');
  const player = authorization(playerId, 'player');

  const team = await request(app).post('/api/teams').set(captain).send({ name: `Equipo ${suffix}`, abbreviation: `E${suffix.slice(-5)}`, sport: 'Valorant', region: 'LATAM', competitionType: 'Regional', description: '', status: 'active' });
  assert.equal(team.status, 201);
  assert.equal(team.body.captainUserId, captainId);

  const profile = await request(app).post('/api/players').set(player).send({ name: 'Jugador', lastname: 'Invitado', nickname: `P${suffix.slice(-6)}`, sport: 'Valorant', position: 'Jugador', nationality: 'MX', gameProfiles: { riot: `Riot-${suffix}` } });
  assert.equal(profile.status, 201);

  const invitation = await request(app).post(`/api/teams/${team.body.id}/invitations`).set(captain).send({ rosterRole: 'Duelista', expiresInHours: 24 });
  assert.equal(invitation.status, 201);
  const join = await request(app).post('/api/teams/join-requests').set(player).send({ code: invitation.body.invitation.code, playerId: profile.body.id });
  assert.equal(join.status, 201);

  const approved = await request(app).patch(`/api/teams/${team.body.id}/join-requests/${join.body.request.id}`).set(captain).send({ decision: 'approve' });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.request.status, 'APPROVED');
  const detail = await request(app).get(`/api/teams/${team.body.id}`);
  assert.ok(detail.body.roster.some((member) => member.playerId === profile.body.id));
});

test('el resultado aprobado conecta check-in, calendario, bracket, notificaciÃ³n y premio', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const organizer = authorization(`organizer-${suffix}`, 'organizer');
  const captainOne = authorization(`captain-one-${suffix}`, 'captain');
  const captainTwo = authorization(`captain-two-${suffix}`, 'captain');
  const createTeam = (auth, name, abbreviation) => request(app).post('/api/teams').set(auth).send({ name, abbreviation, sport: 'Valorant', region: 'LATAM', competitionType: 'Regional', description: '', status: 'active' });
  const [teamOne, teamTwo] = await Promise.all([createTeam(captainOne, `Uno ${suffix}`, `U${suffix.slice(-4)}`), createTeam(captainTwo, `Dos ${suffix}`, `D${suffix.slice(-4)}`)]);
  assert.equal(teamOne.status, 201); assert.equal(teamTwo.status, 201);

  const tournament = await request(app).post('/api/tournaments').set(organizer).send({ name: `Copa conectada ${suffix}`, game: 'Valorant', format: 'SINGLE_ELIMINATION', maxTeams: 2 });
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(organizer).send({ teamId: teamOne.body.id, seed: 1 });
  await request(app).post(`/api/tournaments/${tournament.body.id}/participants`).set(organizer).send({ teamId: teamTwo.body.id, seed: 2 });
  const bracket = await request(app).post(`/api/tournaments/${tournament.body.id}/bracket/generate`).set(organizer);
  const bracketMatchId = bracket.body[0].matches[0].id;

  const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const schedule = await request(app).post('/api/schedules').set(organizer).send({ tournamentId: tournament.body.id, teamIds: [teamOne.body.id, teamTwo.body.id], startsAt, slotMinutes: 60, format: 'single_elimination' });
  assert.equal(schedule.status, 201);
  const match = schedule.body.matches[0];
  assert.equal(match.roundId, bracketMatchId);

  const sponsor = await request(app).post('/api/sponsors').set(organizer).send({ name: `Sponsor ${suffix}`, contactEmail: `sponsor-${suffix}@example.test` });
  const pool = await request(app).post('/api/prize-pools').set(organizer).send({ tournamentId: tournament.body.id, name: `Premio ${suffix}`, currency: 'USD' });
  const contribution = await request(app).post(`/api/prize-pools/${pool.body.data.id}/contributions`).set(organizer).send({ sponsorId: sponsor.body.data.id, amount: 500, provider: 'stripe', idempotencyKey: `flow-${suffix}` });
  await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/test-authorize`).set(organizer);
  await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/capture`).set(organizer);
  await request(app).put(`/api/prize-pools/${pool.body.data.id}/distribution`).set(organizer).send({ rules: [{ position: 1, percentage: 100 }] });

  const firstCheckIn = await request(app).post(`/api/matches/${match.id}/check-in`).set(captainOne).send({ teamId: teamOne.body.id });
  const secondCheckIn = await request(app).post(`/api/matches/${match.id}/check-in`).set(captainTwo).send({ teamId: teamTwo.body.id });
  assert.equal(firstCheckIn.status, 200); assert.equal(secondCheckIn.body.match.status, 'live');

  const report = await request(app).post(`/api/matches/${match.id}/reports`).set(captainOne).send({ teamId: teamOne.body.id, team1Score: 2, team2Score: 0, evidenceUrl: 'https://example.test/evidence/result.png' });
  assert.equal(report.status, 201);
  const decision = await request(app).patch(`/api/matches/${match.id}/reports/${report.body.report.id}`).set(organizer).send({ decision: 'approve', reviewNote: 'Evidencia vÃ¡lida' });
  assert.equal(decision.status, 200);
  assert.equal(decision.body.match.status, 'completed');
  assert.equal(decision.body.integration.bracket, 'advanced');
  assert.equal(decision.body.integration.payouts.length, 1);

  const status = await request(app).get(`/api/tournaments/${tournament.body.id}/status`);
  assert.equal(status.body.status, 'COMPLETED');
  assert.equal(status.body.championId, teamOne.body.id);
  const updatedPool = await request(app).get(`/api/prize-pools/${pool.body.data.id}`).set(organizer);
  assert.equal(updatedPool.body.data.status, 'distributed');
  assert.equal(updatedPool.body.data.payouts[0].recipientId, teamOne.body.id);
});
