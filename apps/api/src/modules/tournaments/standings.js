/**
 * Calcula la tabla de posiciones de un grupo a partir de sus partidos
 * finalizados. 3 puntos por victoria, 1 por empate, 0 por derrota.
 * Ordena por puntos, luego diferencia y luego a favor.
 */
function computeGroupStandings(participants, matches) {
  const table = new Map();
  for (const participant of participants) {
    table.set(participant.id, {
      participantId: participant.id,
      name: participant.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== 'completed') continue;
    const row1 = table.get(match.participant1Id);
    const row2 = table.get(match.participant2Id);
    if (!row1 || !row2) continue;

    row1.played += 1;
    row2.played += 1;
    row1.scoreFor += match.participant1Score;
    row1.scoreAgainst += match.participant2Score;
    row2.scoreFor += match.participant2Score;
    row2.scoreAgainst += match.participant1Score;

    if (match.participant1Score > match.participant2Score) {
      row1.won += 1;
      row2.lost += 1;
      row1.points += 3;
    } else if (match.participant2Score > match.participant1Score) {
      row2.won += 1;
      row1.lost += 1;
      row2.points += 3;
    } else {
      row1.drawn += 1;
      row2.drawn += 1;
      row1.points += 1;
      row2.points += 1;
    }
  }

  return [...table.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.scoreFor - a.scoreAgainst;
    const diffB = b.scoreFor - b.scoreAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.scoreFor - a.scoreFor;
  });
}

module.exports = { computeGroupStandings };
