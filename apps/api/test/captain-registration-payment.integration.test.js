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

function token(role, sub = crypto.randomUUID()) {
  return { sub, value: jwt.sign({ sub, role, email: `${role}-${sub}@localhost` }, env.jwtSecret, { expiresIn: '10m' }) };
}

test('el capitán paga con Stripe únicamente la inscripción de su propio equipo', async () => {
  const captain = token('captain');
  const otherCaptain = token('captain');
  const organizer = token('organizer');
  const admin = token('admin');

  const team = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${captain.value}`)
    .send({ name: 'Equipo pago Dev 8', abbreviation: `P${Date.now().toString().slice(-5)}`, sport: 'Valorant', region: 'LATAM', competitionType: 'Regional' })
    .expect(201);

  const tournament = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${organizer.value}`)
    .send({ name: 'Torneo con inscripción Dev 8', game: 'Valorant', maxTeams: 8, entryFee: 25, entryCurrency: 'USD' })
    .expect(201);

  await request(app)
    .post(`/api/tournaments/${tournament.body.id}/registrations/stripe`)
    .set('Authorization', `Bearer ${admin.value}`)
    .send({ teamId: team.body.id, idempotencyKey: crypto.randomUUID() })
    .expect(403);

  await request(app)
    .post(`/api/tournaments/${tournament.body.id}/registrations/stripe`)
    .set('Authorization', `Bearer ${otherCaptain.value}`)
    .send({ teamId: team.body.id, idempotencyKey: crypto.randomUUID() })
    .expect(403);

  const idempotencyKey = crypto.randomUUID();
  const created = await request(app)
    .post(`/api/tournaments/${tournament.body.id}/registrations/stripe`)
    .set('Authorization', `Bearer ${captain.value}`)
    .send({ teamId: team.body.id, idempotencyKey })
    .expect(201);

  assert.equal(created.body.data.amount, 25);
  assert.equal(created.body.data.currency, 'USD');
  assert.equal(created.body.data.provider, 'stripe');
  assert.equal(created.body.data.status, 'pending');
  assert.equal(created.body.payment.simulated, true);
  assert.equal(created.body.data.captainUserId, captain.sub);

  const reused = await request(app)
    .post(`/api/tournaments/${tournament.body.id}/registrations/stripe`)
    .set('Authorization', `Bearer ${captain.value}`)
    .send({ teamId: team.body.id, idempotencyKey })
    .expect(200);
  assert.equal(reused.body.data.id, created.body.data.id);
  assert.equal(reused.body.payment.reused, true);

  await request(app)
    .post(`/api/registrations/${created.body.data.id}/stripe/test-authorize`)
    .set('Authorization', `Bearer ${captain.value}`)
    .expect(200);

  const captured = await request(app)
    .post(`/api/registrations/${created.body.data.id}/stripe/capture`)
    .set('Authorization', `Bearer ${captain.value}`)
    .expect(200);
  assert.equal(captured.body.data.status, 'paid');

  const mine = await request(app)
    .get(`/api/tournaments/${tournament.body.id}/registrations/me`)
    .set('Authorization', `Bearer ${captain.value}`)
    .expect(200);
  assert.equal(mine.body.data[0].status, 'paid');
  assert.equal(mine.body.data[0].enrollmentStatus, 'confirmed');

  const participants = await request(app).get(`/api/tournaments/${tournament.body.id}/participants`).expect(200);
  assert.equal(participants.body.filter((participant) => participant.id === team.body.id).length, 1);
});
