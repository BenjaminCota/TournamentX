const HttpError = require('../../utils/http-error');

/**
 * Distribuye participantes en grupos usando reparto en zigzag (snake)
 * para equilibrar la fuerza relativa de cada grupo según el orden de seed.
 */
function generateGroups(participants, groupCount) {
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new HttpError(400, 'Se requieren al menos 2 participantes para generar grupos');
  }
  if (!Number.isInteger(groupCount) || groupCount < 1) {
    throw new HttpError(400, 'La cantidad de grupos debe ser un entero mayor que cero');
  }
  if (groupCount > participants.length) {
    throw new HttpError(400, 'No puede haber más grupos que participantes');
  }

  const groups = Array.from({ length: groupCount }, () => []);
  let groupIndex = 0;
  let direction = 1;
  for (const participant of participants) {
    groups[groupIndex].push(participant);
    if (direction === 1) {
      if (groupIndex === groupCount - 1) direction = -1;
      else groupIndex += 1;
    } else if (groupIndex === 0) {
      direction = 1;
    } else {
      groupIndex -= 1;
    }
  }
  return groups;
}

/**
 * Genera el calendario de todos contra todos (round-robin) de un grupo
 * mediante el método del círculo. Si el número de participantes es impar,
 * se agrega un descanso (bye) que rota entre rondas.
 */
function generateRoundRobinMatches(groupParticipants) {
  if (!Array.isArray(groupParticipants) || groupParticipants.length < 2) {
    throw new HttpError(400, 'Un grupo necesita al menos 2 participantes para jugar');
  }

  let arrangement = [...groupParticipants];
  if (arrangement.length % 2 !== 0) arrangement.push(null);

  const size = arrangement.length;
  const totalRounds = size - 1;
  const half = size / 2;
  const roundsOfMatches = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const matches = [];
    for (let i = 0; i < half; i += 1) {
      const participant1 = arrangement[i];
      const participant2 = arrangement[size - 1 - i];
      if (participant1 && participant2) {
        matches.push({ round: round + 1, participant1, participant2 });
      }
    }
    roundsOfMatches.push(matches);

    const fixed = arrangement[0];
    const rest = arrangement.slice(1);
    rest.unshift(rest.pop());
    arrangement = [fixed, ...rest];
  }

  return roundsOfMatches;
}

module.exports = { generateGroups, generateRoundRobinMatches };
