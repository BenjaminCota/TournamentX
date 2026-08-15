const test = require('node:test');
const assert = require('node:assert/strict');
const { nextPowerOfTwo, buildSeedOrder, generateSingleEliminationBracket } = require('../src/modules/tournaments/bracket-generator');
const { generateGroups, generateRoundRobinMatches } = require('../src/modules/tournaments/group-generator');

test('nextPowerOfTwo redondea hacia arriba', () => {
  assert.equal(nextPowerOfTwo(1), 1);
  assert.equal(nextPowerOfTwo(3), 4);
  assert.equal(nextPowerOfTwo(8), 8);
  assert.equal(nextPowerOfTwo(9), 16);
});

test('buildSeedOrder produce el orden estándar de siembra', () => {
  assert.deepEqual(buildSeedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(buildSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test('genera un bracket completo sin byes cuando el tamaño es potencia de 2', () => {
  const participants = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const { rounds, totalRounds } = generateSingleEliminationBracket(participants);
  assert.equal(totalRounds, 2);
  assert.equal(rounds[0].length, 2);
  assert.equal(rounds[1].length, 1);
  assert.ok(rounds[0].every((match) => match.status === 'scheduled'));
  assert.equal(rounds[1][0].participant1, null);
});

test('resuelve byes cuando el número de participantes no es potencia de 2', () => {
  const participants = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const { rounds } = generateSingleEliminationBracket(participants);
  const byeMatch = rounds[0].find((match) => match.status === 'bye');
  assert.ok(byeMatch);
  assert.equal(byeMatch.winner.id, 'a');
  assert.equal(rounds[1][0].participant1.id, 'a');
});

test('rechaza generar un bracket con menos de 2 participantes', () => {
  assert.throws(() => generateSingleEliminationBracket([{ id: 'a' }]), /al menos 2 participantes/);
});

test('generateGroups reparte en zigzag para equilibrar la fuerza de los grupos', () => {
  const participants = [1, 2, 3, 4, 5, 6].map((seed) => ({ id: `p${seed}`, seed }));
  const groups = generateGroups(participants, 2);
  assert.deepEqual(groups[0].map((p) => p.seed), [1, 4, 5]);
  assert.deepEqual(groups[1].map((p) => p.seed), [2, 3, 6]);
});

test('generateRoundRobinMatches hace que todos jueguen contra todos', () => {
  const participants = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const rounds = generateRoundRobinMatches(participants);
  const pairs = rounds.flat().map((match) => [match.participant1.id, match.participant2.id].sort().join('-'));
  assert.deepEqual(pairs.sort(), ['a-b', 'a-c', 'b-c']);
});
