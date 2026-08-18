const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

const playerAuthorization = {
  Authorization: `Bearer ${jwt.sign({ sub: 'authorization-player', role: 'player' }, process.env.JWT_SECRET || 'development-only-secret')}`,
};

const protectedMutations = [
  ['post', '/api/teams'],
  ['patch', '/api/teams/unknown-team'],
  ['post', '/api/teams/unknown-team/roster'],
  ['delete', '/api/teams/unknown-team/roster/unknown-player'],
  ['post', '/api/players'],
  ['patch', '/api/players/unknown-player'],
  ['post', '/api/tournaments'],
  ['post', '/api/tournaments/unknown-tournament/participants'],
  ['post', '/api/tournaments/unknown-tournament/groups/generate'],
  ['put', '/api/tournaments/unknown-tournament/group-matches/unknown-match/result'],
  ['post', '/api/tournaments/unknown-tournament/bracket/generate'],
  ['put', '/api/tournaments/unknown-tournament/bracket-matches/unknown-match/result'],
  ['post', '/api/matches'],
  ['patch', '/api/matches/unknown-match/score'],
  ['post', '/api/schedules'],
  ['post', '/api/geolocation/notifications'],
  ['post', '/api/media/lobbies'],
  ['patch', '/api/media/lobbies/unknown-lobby'],
  ['delete', '/api/media/lobbies/unknown-lobby'],
  ['post', '/api/sponsors'],
  ['post', '/api/prize-pools'],
  ['post', '/api/prize-pools/unknown-pool/contributions'],
  ['put', '/api/prize-pools/unknown-pool/distribution'],
  ['post', '/api/prize-pools/unknown-pool/results'],
  ['post', '/api/prize-pools/unknown-pool/payouts'],
  ['post', '/api/contributions/unknown-contribution/stripe/test-authorize'],
  ['post', '/api/contributions/unknown-contribution/stripe/capture'],
  ['post', '/api/rewards'],
  ['post', '/api/rewards/unknown-reward/assignments'],
  ['patch', '/api/auth/users/unknown-user'],
];

test('las mutaciones protegidas requieren sesión autenticada', async () => {
  for (const [method, path] of protectedMutations) {
    const response = await request(app)[method](path).send({});
    assert.equal(response.status, 401, `${method.toUpperCase()} ${path}`);
  }
});

test('el rol player no puede ejecutar mutaciones administrativas', async () => {
  for (const [method, path] of protectedMutations) {
    if (method === 'post' && path === '/api/players') continue;
    const response = await request(app)[method](path).set(playerAuthorization).send({});
    assert.equal(response.status, 403, `${method.toUpperCase()} ${path}`);
  }
});
