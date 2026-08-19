const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

async function adminSession() {
  const response = await request(app).post('/api/auth/login').send({ email: 'admin@tournamentx.local', password: 'Admin123!' });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'admin');
  return response.body.token;
}

test('Dev 1 autentica, registra y protege la administración de roles', async () => {
  const token = await adminSession();
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200); assert.equal(me.body.user.email, 'admin@tournamentx.local');
  const registeredEmail = `guest-${Date.now()}@example.test`;
  const registration = await request(app).post('/api/auth/register').send({ name: 'Persona Invitada', email: registeredEmail, password: 'Password123!' });
  assert.equal(registration.status, 201); assert.equal(registration.body.user.role, 'player');
  const newSession = await request(app).post('/api/auth/login').send({ email: registeredEmail, password: 'Password123!' });
  assert.equal(newSession.status, 200); assert.equal(newSession.body.user.id, registration.body.user.id);
  const invalidSession = await request(app).post('/api/auth/login').send({ email: registeredEmail, password: 'Incorrecta123!' });
  assert.equal(invalidSession.status, 401);
  const forbidden = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${registration.body.token}`);
  assert.equal(forbidden.status, 403);
  const users = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${token}`);
  assert.equal(users.status, 200); assert.ok(users.body.data.length >= 5); assert.equal('passwordHash' in users.body.data[0], false);
  const promotion = await request(app).patch(`/api/auth/users/${registration.body.user.id}`).set('Authorization', `Bearer ${token}`).send({ role: 'admin' });
  assert.equal(promotion.status, 403);
});

test('Dev 5 calcula métricas y rankings desde los módulos del sistema', async () => {
  const response = await request(app).get('/api/analytics/overview');
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.metrics.completionRate, 'number');
  assert.ok(Array.isArray(response.body.ranking));
  assert.ok(response.body.metrics.tournaments >= 1);
});

test('Partidos, estadísticas y equipos comparten el feed competitivo regional', async () => {
  const response = await request(app).get('/api/competitive/overview');
  assert.equal(response.status, 200);
  assert.ok(response.body.events.some((event) => event.category === 'esports'));
  assert.ok(response.body.events.some((event) => event.category === 'sports'));
  assert.ok(response.body.events.some((event) => event.region === 'LATAM'));
  assert.ok(response.body.events.some((event) => event.region === 'Europa'));
  assert.ok(response.body.standings.every((standing) => Array.isArray(standing.table)));
  assert.ok(response.body.teams.every((team) => Array.isArray(team.players) && Array.isArray(team.form)));
});

test('Dev 6 gestiona lobbies, métricas y fuentes de stream', async () => {
  const token = await adminSession();
  const streams = await request(app).get('/api/media/streams');
  assert.equal(streams.status, 200); assert.ok(streams.body.data.length >= 2);
  assert.ok(streams.body.data.every((stream) => stream.embedId));
  assert.ok(streams.body.data.some((stream) => stream.platform === 'Twitch'));
  assert.ok(streams.body.data.some((stream) => stream.platform === 'YouTube'));
  assert.ok(streams.body.data.some((stream) => stream.embedId === 'lolesportsla'));
  assert.ok(streams.body.data.some((stream) => stream.embedId === '6VOfpE_HGpw'));
  const events = await request(app).get('/api/media/events');
  assert.equal(events.status, 200); assert.ok(events.body.data.length >= 6);
  assert.ok(events.body.data.some((event) => event.category === 'esports'));
  assert.ok(events.body.data.some((event) => event.category === 'sports'));
  const invalid = await request(app).post('/api/media/lobbies').set('Authorization', `Bearer ${token}`).send({ name: 'x' });
  assert.equal(invalid.status, 400);
  const created = await request(app).post('/api/media/lobbies').set('Authorization', `Bearer ${token}`).send({ name: 'Lobby de prueba', game: 'Valorant', server: 'LATAM', map: 'Haven', team1: 'Alpha', team2: 'Beta', status: 'Waiting', ping: 22, maxPlayers: 10 });
  assert.equal(created.status, 201);
  const updated = await request(app).patch(`/api/media/lobbies/${created.body.data.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'In Game', players: 10 });
  assert.equal(updated.status, 200); assert.equal(updated.body.data.players, 10);
  const metrics = await request(app).get('/api/media/metrics');
  assert.equal(metrics.status, 200); assert.ok(metrics.body.data.some((item) => item.game === 'Valorant'));
});

test('Dev 8 completa el flujo financiero local con idempotencia y recibo', async () => {
  const token = await adminSession(); const authorization = { Authorization: `Bearer ${token}` };
  const pools = await request(app).get('/api/prize-pools').set(authorization); const sponsors = await request(app).get('/api/sponsors').set(authorization);
  assert.equal(pools.status, 200); assert.equal(sponsors.status, 200);
  const pool = pools.body.data[0]; const sponsor = sponsors.body.data[0]; const key = `test-${Date.now()}`;
  const contribution = await request(app).post(`/api/prize-pools/${pool.id}/contributions`).set(authorization).send({ sponsorId: sponsor.id, amount: 100, provider: 'stripe', idempotencyKey: key });
  assert.equal(contribution.status, 201);
  const reused = await request(app).post(`/api/prize-pools/${pool.id}/contributions`).set(authorization).send({ sponsorId: sponsor.id, amount: 100, provider: 'stripe', idempotencyKey: key });
  assert.equal(reused.status, 200); assert.equal(reused.body.data.id, contribution.body.data.id);
  await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/test-authorize`).set(authorization);
  const captured = await request(app).post(`/api/contributions/${contribution.body.data.id}/stripe/capture`).set(authorization);
  assert.equal(captured.status, 200); assert.equal(captured.body.data.status, 'paid');
  const distribution = await request(app).put(`/api/prize-pools/${pool.id}/distribution`).set(authorization).send({ rules: [{ position: 1, percentage: 100 }] });
  assert.equal(distribution.status, 200);
  const payout = await request(app).post(`/api/prize-pools/${pool.id}/payouts`).set(authorization).send({ recipientId: 'team-winner', position: 1, destination: 'local:winner' });
  assert.equal(payout.status, 201);
  const receipt = await request(app).get(`/api/receipts/${payout.body.data.receiptCode}`).set(authorization);
  assert.equal(receipt.status, 200); assert.equal(receipt.body.data.recipientId, 'team-winner');
});
