const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('expone el estado de la API', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.app, 'TournamentX');
  assert.equal(response.body.storage, 'local-json');
  assert.equal(response.body.realtime.status, 'not-attached');
  assert.equal(response.body.modules, 8);
  assert.ok(response.headers['x-request-id']);
});

test('protege las rutas administrativas', async () => {
  const response = await request(app).get('/api/sponsors');
  assert.equal(response.status, 401);
});

test('publica la documentación Swagger', async () => {
  const response = await request(app).get('/api/docs/');
  assert.equal(response.status, 200);
  assert.match(response.text, /TournamentX API/);
});
