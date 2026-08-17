const teamStore = require('./team-store');

function getActiveTeam(teamId) {
  const team = teamStore.getTeam(teamId);
  return team?.status === 'active' ? team : null;
}

module.exports = { getActiveTeam };
