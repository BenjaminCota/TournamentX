const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const store = require('./media.store');
const { externalStreams } = require('./media.providers');
const matchStore = require('../matches/match-store');
const workflowStore = require('../matches/match-workflow.store');
const teamStore = require('../teams/team-store');
const { competitiveOverview } = require('../competitive-data/competitive-data.providers');

const lobbySchema = z.object({ name: z.string().trim().min(3).max(100), game: z.string().trim().min(2).max(60), server: z.string().trim().min(2).max(80), map: z.string().trim().min(1).max(80), team1: z.string().trim().min(1).max(100), team2: z.string().trim().min(1).max(100), matchId: z.string().trim().min(1).max(120).optional(), streamId: z.string().trim().min(1).max(120).optional(), roomName: z.string().trim().min(1).max(120).optional(), roomPassword: z.string().trim().min(4).max(120).optional(), status: z.enum(['In Game', 'Waiting', 'Paused']).default('Waiting'), ping: z.coerce.number().int().min(0).max(1000).default(0), maxPlayers: z.coerce.number().int().min(2).max(128).default(10) });
const lobbyUpdate = lobbySchema.partial().extend({ players: z.coerce.number().int().min(0).max(128).optional() }).refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un cambio');
function validated(schema, req, next) { const result = schema.safeParse(req.body); if (!result.success) { next(Object.assign(new Error('Datos del lobby no válidos'), { status: 400, details: result.error.flatten() })); return null; } return result.data; }

router.get('/streams', async (_req, res, next) => { try { const result = await externalStreams(store.listStreams()); res.json({ data: result.streams, integration: result.integration }); } catch (error) { next(error); } });
router.get('/events', async (_req, res, next) => {
  try {
    const overview = await competitiveOverview();
    const data = overview.events.map((event) => ({
      id: event.id, category: event.category, sport: event.sport, tournament: event.competition, stage: event.round,
      participantA: { name: event.teamA.name, shortName: event.teamA.shortName, score: event.teamA.score },
      participantB: { name: event.teamB.name, shortName: event.teamB.shortName, score: event.teamB.score },
      clockLabel: event.status === 'live' ? 'En curso' : event.status === 'completed' ? 'Finalizado' : 'Programado',
      elapsedSeconds: 0, context: `${event.venue} · ${event.source}`, viewers: 0,
      status: event.status === 'live' ? 'LIVE' : event.status === 'completed' ? 'FINAL' : 'UPCOMING',
      dataMode: event.dataMode, source: event.source,
      stats: [
        { label: 'Marcador', a: String(event.teamA.score), b: String(event.teamB.score) },
        { label: 'Resultado', a: event.status === 'completed' ? 'Oficial' : '—', b: event.status === 'completed' ? 'Oficial' : '—' },
      ],
    }));
    res.json({ data, generatedAt: overview.generatedAt });
  } catch (error) { next(error); }
});
router.get('/lobbies', (req, res) => res.json({ data: store.listLobbies(req.query) }));
router.get('/metrics', (_req, res) => res.json({ data: store.metrics(), generatedAt: new Date().toISOString() }));
router.post('/lobbies', authenticate, authorize('admin', 'organizer', 'captain'), (req, res, next) => { const input = validated(lobbySchema, req, next); if (!input) return; const lobby = store.createLobby(input); req.app.get('io')?.emit('lobby:created', lobby); res.status(201).json({ data: lobby }); });
router.patch('/lobbies/:id', authenticate, authorize('admin', 'organizer', 'captain'), (req, res, next) => { const input = validated(lobbyUpdate, req, next); if (!input) return; const lobby = store.updateLobby(req.params.id, input); if (!lobby) return next(Object.assign(new Error('Lobby no encontrado'), { status: 404 })); req.app.get('io')?.emit('lobby:updated', lobby); return res.json({ data: lobby }); });
router.get('/lobbies/:id/credentials', authenticate, async (req, res, next) => {
  try {
    const lobby = store.getLobby(req.params.id);
    if (!lobby) return next(Object.assign(new Error('Lobby no encontrado'), { status: 404 }));
    const role = String(req.user.role || '').toLowerCase();
    if (!['admin', 'organizer'].includes(role)) {
      if (role !== 'captain' || !lobby.matchId) return next(Object.assign(new Error('No tienes acceso a las credenciales'), { status: 403 }));
      const match = await matchStore.getMatch(lobby.matchId);
      if (!match) return next(Object.assign(new Error('El partido vinculado no existe'), { status: 409 }));
      const teamId = [match?.team1Id, match?.team2Id].find((id) => teamStore.canUserManageTeam(id, req.user.sub));
      const confirmed = workflowStore.getWorkflow(lobby.matchId).checkIns.some((entry) => entry.teamId === teamId && entry.status === 'CONFIRMED');
      if (!teamId || !confirmed) return next(Object.assign(new Error('Completa el check-in de tu equipo para ver la sala'), { status: 403 }));
    }
    const credentials = store.getLobbyCredentials(lobby.id);
    if (!credentials) return next(Object.assign(new Error('El lobby no tiene credenciales configuradas'), { status: 404 }));
    return res.json({ data: credentials });
  } catch (error) { return next(error); }
});
router.delete('/lobbies/:id', authenticate, authorize('admin', 'organizer'), (req, res, next) => { if (!store.removeLobby(req.params.id)) return next(Object.assign(new Error('Lobby no encontrado'), { status: 404 })); req.app.get('io')?.emit('lobby:deleted', { id: req.params.id }); return res.status(204).end(); });

module.exports = router;
