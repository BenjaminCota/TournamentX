const localStore = require('../../config/local-store');
const tournamentStore = require('../tournaments/tournament-store');
const { publishMatchResult, publishTournamentChampion } = require('../geolocation/notifications.service');
const { releaseTournamentChampion } = require('../rewards/local-rewards.service');

const events = localStore.collection('officialMatchEvents', []);

function persist() { localStore.saveCollection('officialMatchEvents', events); }

async function synchronizeOfficialResult(app, match, approvedBy) {
  const previous = events.find((entry) => entry.matchId === match.id);
  if (previous) return { ...previous, reused: true };

  const result = { id: require('node:crypto').randomUUID(), matchId: match.id, tournamentId: match.tournamentId, bracket: 'not_linked', notification: 'published', payouts: [], createdAt: new Date().toISOString() };
  if (match.roundId) {
    try {
      const rounds = tournamentStore.getBracket(match.tournamentId);
      const bracketMatch = rounds.flatMap((round) => round.matches).find((entry) => entry.id === match.roundId);
      if (bracketMatch?.status === 'FINISHED') result.bracket = 'already_applied';
      else if (bracketMatch) {
        tournamentStore.reportBracketMatchResult(match.tournamentId, match.roundId, { score1: match.score.team1, score2: match.score.team2 });
        result.bracket = 'advanced';
      }
    } catch (_error) { result.bracket = 'not_linked'; }
  }

  publishMatchResult(app, match);
  try {
    const tournamentStatus = tournamentStore.getStatus(match.tournamentId);
    if (tournamentStatus.status === 'COMPLETED') {
      const tournament = tournamentStore.getTournament(match.tournamentId);
      const champion = tournamentStore.listParticipants(match.tournamentId).find((participant) => participant.id === tournamentStatus.championId);
      publishTournamentChampion(app, tournament, champion?.name || tournamentStatus.championId);
      result.payouts = await releaseTournamentChampion(match.tournamentId, approvedBy);
    }
  } catch (_error) { /* El partido puede no pertenecer a un torneo local. */ }

  events.push(result); persist();
  return { ...result, reused: false };
}

module.exports = { synchronizeOfficialResult };
