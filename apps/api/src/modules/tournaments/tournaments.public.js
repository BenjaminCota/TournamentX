const tournamentStore = require('./tournament-store');

function getRegisteredTeamIds(tournamentId) {
  try {
    return new Set(tournamentStore.listParticipants(tournamentId).map((participant) => participant.id));
  } catch (_error) {
    return null;
  }
}

module.exports = { getRegisteredTeamIds };
