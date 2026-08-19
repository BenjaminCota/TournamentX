function publishTournamentUpdate(app, tournamentId, action) {
  const io = app?.get?.('io');
  if (!io) return;
  io.to('platform').emit('tournament-update', {
    tournamentId,
    action,
    updatedAt: new Date().toISOString(),
  });
}

module.exports = { publishTournamentUpdate };
