const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
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
    const event = waitFor(client, 'notification:new');
    const response = await request(app).post('/api/geolocation/notifications').send({
      title: 'Cambio de sede', message: 'La final se movió a Arena CDMX.', type: 'schedule',
    });
    assert.equal(response.status, 201);
    assert.equal((await event).title, 'Cambio de sede');
  } finally {
    client.disconnect(); io.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
