function publishTournamentUpdate(app, tournamentId, action) {
  const io = app?.get?.('io');
  if (!io) return;
  io.to('platform').emit('tournament-update', {
    tournamentId,
    action,
    updatedAt: new Date().toISOString(),
  });
}

function publishTeamUpdate(app, teamId, action) {
  const io = app?.get?.('io');
  if (!io) return;
  io.to('platform').emit('team-update', {
    teamId,
    action,
    updatedAt: new Date().toISOString(),
  });
}

module.exports = { publishTournamentUpdate, publishTeamUpdate };
