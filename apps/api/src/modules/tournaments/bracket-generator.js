const HttpError = require('../../utils/http-error');

function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

function buildSeedOrder(size) {
  let seeds = [1, 2];
  const rounds = Math.log2(size);
  for (let r = 1; r < rounds; r += 1) {
    const newSize = seeds.length * 2;
    const newSeeds = [];
    for (const seed of seeds) {
      newSeeds.push(seed, newSize + 1 - seed);
    }
    seeds = newSeeds;
  }
  return seeds;
}

function roundName(matchesInRound) {
  if (matchesInRound === 1) return 'Final';
  if (matchesInRound === 2) return 'Semifinal';
  if (matchesInRound === 4) return 'Cuartos de Final';
  if (matchesInRound === 8) return 'Octavos de Final';
  return `Ronda de ${matchesInRound * 2}`;
}

/**
 * Genera un bracket de eliminación directa a partir de participantes ya
 * ordenados por seed (participants[0] es el primer sembrado). Usa el
 * algoritmo estándar de emparejamiento (1 vs último, 2 vs penúltimo, ...)
 * y resuelve los "byes" cuando el número de participantes no es potencia de 2.
 * Devuelve posiciones relativas (round, matchOrder, nextMatchOrder, nextSlot);
 * la capa de almacenamiento resuelve los ids reales de cada partido.
 */
function generateSingleEliminationBracket(participants) {
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new HttpError(400, 'Se requieren al menos 2 participantes para generar un bracket');
  }

  const size = nextPowerOfTwo(participants.length);
  const seedOrder = buildSeedOrder(size);
  const slots = seedOrder.map((seed) => participants[seed - 1] || null);
  const totalRounds = Math.log2(size);
  const rounds = [];

  let currentSlots = slots;
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const matchesInRound = currentSlots.length / 2;
    const round = roundIndex + 1;
    const matches = [];
    const winners = [];

    for (let matchOrder = 0; matchOrder < matchesInRound; matchOrder += 1) {
      const participant1 = currentSlots[matchOrder * 2];
      const participant2 = currentSlots[matchOrder * 2 + 1];
      const isFirstRound = roundIndex === 0;
      let status = 'pending';
      let winner = null;

      if (isFirstRound && (participant1 === null || participant2 === null)) {
        winner = participant1 || participant2;
        status = winner ? 'bye' : 'pending';
      } else if (participant1 && participant2) {
        status = 'scheduled';
      }

      matches.push({
        round,
        matchOrder,
        roundName: roundName(matchesInRound),
        participant1,
        participant2,
        status,
        winner,
        nextMatchOrder: round < totalRounds ? Math.floor(matchOrder / 2) : null,
        nextSlot: round < totalRounds ? (matchOrder % 2 === 0 ? 1 : 2) : null,
      });
      winners.push(winner);
    }

    rounds.push(matches);
    currentSlots = winners;
  }

  return { size, totalRounds, rounds };
}

module.exports = { nextPowerOfTwo, buildSeedOrder, generateSingleEliminationBracket };
