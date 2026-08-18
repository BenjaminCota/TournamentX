const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const { createRealtimeServer } = require('../src/server');

function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No se recibió ${event}`)), 3000);
    socket.once(event, (payload) => { clearTimeout(timeout); resolve(payload); });
  });
}

test('Dev 7 devuelve sedes ordenadas por cercanía y respeta el radio', async () => {
  const response = await request(app).get('/api/geolocation/nearby?lat=19.43&lng=-99.13&radiusKm=100');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, 'ven-1');
  assert.ok(response.body[0].distanceKm < 100);
});

test('Dev 7 valida coordenadas inválidas', async () => {
  const response = await request(app).get('/api/geolocation/nearby?lat=200&lng=-99');
  assert.equal(response.status, 400);
});

test('Dev 7 emite notificaciones en tiempo real a los suscriptores', async () => {
  const { server, io } = createRealtimeServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const client = createClient(`http://127.0.0.1:${address.port}`, { transports: ['websocket'] });
  try {
    await waitFor(client, 'connect');
    await new Promise((resolve) => client.emit('subscribe-notifications', resolve));
    const token = jwt.sign({ sub: 'organizer-notifications', role: 'organizer' }, process.env.JWT_SECRET || 'development-only-secret');
    const denied = await request(app).post('/api/geolocation/notifications').send({ title: 'Cambio de sede', message: 'La final se movio a Arena CDMX.', type: 'schedule' });
    assert.equal(denied.status, 401);
    const event = waitFor(client, 'notification:new');
    const response = await request(app).post('/api/geolocation/notifications').set('Authorization', `Bearer ${token}`).send({
      title: 'Cambio de sede', message: 'La final se movió a Arena CDMX.', type: 'schedule',
    });
    assert.equal(response.status, 201);
    assert.equal((await event).title, 'Cambio de sede');
  } finally {
    client.disconnect(); io.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Dev 7 conserva el estado leído por usuario', async () => {
  const userId = `notification-reader-${Date.now()}`;
  const token = jwt.sign({ sub: userId, role: 'player' }, process.env.JWT_SECRET || 'development-only-secret');
  const before = await request(app).get('/api/geolocation/notifications/me').set('Authorization', `Bearer ${token}`);
  assert.equal(before.status, 200);
  assert.ok(before.body.length > 0);
  const target = before.body[0];
  const marked = await request(app).patch(`/api/geolocation/notifications/${target.id}/read`).set('Authorization', `Bearer ${token}`);
  assert.equal(marked.status, 200);
  assert.equal(marked.body.read, true);
  const after = await request(app).get('/api/geolocation/notifications/me').set('Authorization', `Bearer ${token}`);
  assert.equal(after.body.find((item) => item.id === target.id).read, true);
});
