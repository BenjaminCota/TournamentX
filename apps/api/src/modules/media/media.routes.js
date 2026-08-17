const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const store = require('./media.store');
const { externalStreams } = require('./media.providers');

const lobbySchema = z.object({ name: z.string().trim().min(3).max(100), game: z.string().trim().min(2).max(60), server: z.string().trim().min(2).max(80), map: z.string().trim().min(1).max(80), team1: z.string().trim().min(1).max(100), team2: z.string().trim().min(1).max(100), status: z.enum(['In Game', 'Waiting', 'Paused']).default('Waiting'), ping: z.coerce.number().int().min(0).max(1000).default(0), maxPlayers: z.coerce.number().int().min(2).max(128).default(10) });
const lobbyUpdate = lobbySchema.partial().extend({ players: z.coerce.number().int().min(0).max(128).optional() }).refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un cambio');
function validated(schema, req, next) { const result = schema.safeParse(req.body); if (!result.success) { next(Object.assign(new Error('Datos del lobby no válidos'), { status: 400, details: result.error.flatten() })); return null; } return result.data; }

router.get('/streams', async (_req, res, next) => { try { const result = await externalStreams(store.listStreams()); res.json({ data: result.streams, integration: result.integration }); } catch (error) { next(error); } });
router.get('/lobbies', (req, res) => res.json({ data: store.listLobbies(req.query) }));
router.get('/metrics', (_req, res) => res.json({ data: store.metrics(), generatedAt: new Date().toISOString() }));
router.post('/lobbies', authenticate, authorize('admin', 'organizer', 'captain'), (req, res, next) => { const input = validated(lobbySchema, req, next); if (!input) return; const lobby = store.createLobby(input); req.app.get('io')?.emit('lobby:created', lobby); res.status(201).json({ data: lobby }); });
router.patch('/lobbies/:id', authenticate, authorize('admin', 'organizer', 'captain'), (req, res, next) => { const input = validated(lobbyUpdate, req, next); if (!input) return; const lobby = store.updateLobby(req.params.id, input); if (!lobby) return next(Object.assign(new Error('Lobby no encontrado'), { status: 404 })); req.app.get('io')?.emit('lobby:updated', lobby); return res.json({ data: lobby }); });
router.delete('/lobbies/:id', authenticate, authorize('admin', 'organizer'), (req, res, next) => { if (!store.removeLobby(req.params.id)) return next(Object.assign(new Error('Lobby no encontrado'), { status: 404 })); req.app.get('io')?.emit('lobby:deleted', { id: req.params.id }); return res.status(204).end(); });

module.exports = router;
