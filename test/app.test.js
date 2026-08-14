const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('expone el estado de la API', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.module, 'rewards-payments');
});

test('protege las rutas administrativas', async () => {
  const response = await request(app).get('/api/sponsors');
  assert.equal(response.status, 401);
});
