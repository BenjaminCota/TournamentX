const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(response.status, 200);
  return { Authorization: `Bearer ${response.body.token}` };
}

test('Dev 8 publica solamente el resumen financiero para visitantes', async () => {
  const response = await request(app).get('/api/prize-pools/public');
  assert.equal(response.status, 200);
  assert.ok(response.body.data.length >= 1);
  assert.equal('contributions' in response.body.data[0], false);
  assert.equal('payouts' in response.body.data[0], false);
  assert.equal('createdBy' in response.body.data[0], false);
});

test('jugadores consultan premios sin acceder a movimientos privados', async () => {
  const player = await login('player@tournamentx.local', 'Player123!');
  const pools = await request(app).get('/api/prize-pools').set(player);
  assert.equal(pools.status, 200);
  const details = await request(app).get(`/api/prize-pools/${pools.body.data[0].id}`).set(player);
  assert.equal(details.status, 200);
  assert.deepEqual(details.body.data.contributions, []);
  assert.deepEqual(details.body.data.payouts, []);
  assert.equal((await request(app).get('/api/sponsors').set(player)).status, 403);
  assert.equal((await request(app).get('/api/contributions').set(player)).status, 403);
});

test('capitán y jugador pueden consultar el estado de pago de su equipo', async () => {
  const captain = await login('captain@tournamentx.local', 'Captain123!');
  const player = await login('player@tournamentx.local', 'Player123!');
  const tournamentId = 'tour-community';
  assert.equal((await request(app).get(`/api/tournaments/${tournamentId}/registrations/status`).set(captain)).status, 200);
  assert.equal((await request(app).get(`/api/tournaments/${tournamentId}/registrations/status`).set(player)).status, 200);
});

test('la API financiera acepta únicamente Stripe', async () => {
  const admin = await login('admin@tournamentx.local', 'Admin123!');
  const pools = await request(app).get('/api/prize-pools').set(admin);
  const sponsors = await request(app).get('/api/sponsors').set(admin);
  const response = await request(app)
    .post(`/api/prize-pools/${pools.body.data[0].id}/contributions`)
    .set(admin)
    .send({ sponsorId: sponsors.body.data[0].id, amount: 25, provider: 'crypto' });
  assert.equal(response.status, 400);
});

test('los recibos financieros requieren un rol administrador u organizador', async () => {
  const player = await login('player@tournamentx.local', 'Player123!');
  assert.equal((await request(app).get('/api/receipts/unknown')).status, 401);
  assert.equal((await request(app).get('/api/receipts/unknown').set(player)).status, 403);
});
