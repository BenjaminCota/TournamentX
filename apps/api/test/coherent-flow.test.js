const test = require('node:test');
const assert = require('node:assert/strict');
const workflowStore = require('../src/modules/matches/match-workflow.store');
const mediaStore = require('../src/modules/media/media.store');
const tournamentStore = require('../src/modules/tournaments/tournament-store');

test('compara los reportes de ambos capitanes y exige resolver el conflicto', () => {
  const matchId = `match-conflict-${Date.now()}`;
  workflowStore.createReport(matchId, { submittedBy: 'captain-a', submittedForTeamId: 'team-a', team1Score: 2, team2Score: 0, evidenceUrl: 'https://evidence.test/a' });
  const second = workflowStore.createReport(matchId, { submittedBy: 'captain-b', submittedForTeamId: 'team-b', team1Score: 1, team2Score: 2, evidenceUrl: 'https://evidence.test/b' });
  assert.equal(second.comparison, 'CONFLICT');
  const workflow = workflowStore.getWorkflow(matchId);
  assert.equal(workflow.disputes.length, 1);
  assert.equal(workflow.disputes[0].status, 'OPEN');
  const blocked = workflowStore.decideReport(matchId, workflow.reports[0].id, { decision: 'approve', reviewedBy: 'organizer' });
  assert.equal(blocked.status, 409);
  assert.ok(workflowStore.decideDispute(matchId, workflow.disputes[0].id, { decision: 'resolve', resolution: 'Se validó la grabación oficial', resolvedBy: 'organizer' }).dispute);
  assert.equal(workflowStore.decideReport(matchId, workflow.reports[0].id, { decision: 'approve', reviewedBy: 'organizer' }).report.status, 'APPROVED');
});

test('no expone credenciales del lobby en los listados públicos', () => {
  const lobby = mediaStore.createLobby({ name: 'Sala final segura', game: 'Valorant', server: 'LATAM', map: 'Ascent', team1: 'A', team2: 'B', status: 'Waiting', ping: 20, maxPlayers: 10, roomName: 'TX-FINAL', roomPassword: 'secret-1234' });
  const publicLobby = mediaStore.listLobbies().find((entry) => entry.id === lobby.id);
  assert.equal(publicLobby.hasCredentials, true);
  assert.equal(publicLobby.roomPassword, undefined);
  assert.deepEqual(mediaStore.getLobbyCredentials(lobby.id), { roomName: 'TX-FINAL', roomPassword: 'secret-1234' });
});

test('mantiene cinco fuentes oficiales por plataforma en modo sin credenciales', () => {
  const streams = mediaStore.listStreams();
  assert.equal(streams.filter((entry) => entry.platform === 'Twitch').length, 5);
  assert.equal(streams.filter((entry) => entry.platform === 'YouTube').length, 5);
  assert.equal(streams.filter((entry) => entry.platform === 'YouTube' && entry.mediaKind === 'video').length, 5);
  assert.ok(streams.filter((entry) => entry.platform === 'Twitch' && entry.mediaKind === 'video').length >= 2);
  assert.ok(streams.filter((entry) => entry.mediaKind === 'video').every((entry) => /^v?[\w-]{7,}$/.test(entry.embedId)));
});

test('registra transiciones auditables del torneo', () => {
  const tournament = tournamentStore.createTournament({ name: 'Torneo auditable', game: 'Valorant', status: 'DRAFT', createdBy: 'organizer' });
  const change = tournamentStore.changeStatus(tournament.id, 'OPEN', 'organizer', 'Publicación inicial');
  assert.equal(change.tournament.status, 'OPEN');
  assert.equal(tournamentStore.listAudit(tournament.id).at(-1).nextStatus, 'OPEN');
});
