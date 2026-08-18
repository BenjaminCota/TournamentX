process.env.NODE_ENV = 'test';
process.env.STRIPE_MODE = 'simulated';
delete process.env.DATABASE_URL;

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');

function auth(role, sub = crypto.randomUUID()) {
  return { sub, header: `Bearer ${jwt.sign({ sub, role, email: `${role}-${sub}@localhost` }, env.jwtSecret, { expiresIn: '10m' })}` };
}

test('cada organizador administra únicamente sus torneos y bolsas', async () => {
  const owner = auth('organizer');
  const outsider = auth('organizer');
  const admin = auth('admin');

  const tournament = await request(app)
    .post('/api/tournaments')
    .set('Authorization', owner.header)
    .send({ name: 'Torneo privado del organizador', game: 'Valorant', maxTeams: 8 })
    .expect(201);

  await request(app)
    .post('/api/prize-pools')
    .set('Authorization', outsider.header)
    .send({ tournamentId: tournament.body.id, name: 'Bolsa ajena', currency: 'USD' })
    .expect(403);

  const pool = await request(app)
    .post('/api/prize-pools')
    .set('Authorization', owner.header)
    .send({ tournamentId: tournament.body.id, name: 'Bolsa propia del organizador', currency: 'USD' })
    .expect(201);

  await request(app).get(`/api/prize-pools/${pool.body.data.id}`).set('Authorization', outsider.header).expect(403);
  await request(app).get(`/api/prize-pools/${pool.body.data.id}`).set('Authorization', admin.header).expect(200);

  const outsiderPools = await request(app).get('/api/prize-pools').set('Authorization', outsider.header).expect(200);
  assert.equal(outsiderPools.body.data.some((item) => item.id === pool.body.data.id), false);
  const ownerPools = await request(app).get('/api/prize-pools').set('Authorization', owner.header).expect(200);
  assert.equal(ownerPools.body.data.some((item) => item.id === pool.body.data.id), true);

  await request(app)
    .post(`/api/prize-pools/${pool.body.data.id}/contributions`)
    .set('Authorization', outsider.header)
    .send({ sponsorId: 'sponsor-local-01', amount: 20, provider: 'stripe' })
    .expect(403);

  await request(app)
    .post(`/api/prize-pools/${pool.body.data.id}/contributions`)
    .set('Authorization', owner.header)
    .send({ sponsorId: 'sponsor-local-01', amount: 20, provider: 'stripe' })
    .expect(201);
});
