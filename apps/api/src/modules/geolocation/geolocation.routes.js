const router = require('express').Router();
const { z } = require('zod');
const store = require('./geolocation.store');
const { publishNotification } = require('./notifications.service');
const { authenticate, authorize } = require('../../middleware/auth');

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(20000).default(250),
});

const notificationBody = z.object({
  title: z.string().trim().min(2).max(100),
  message: z.string().trim().min(2).max(300),
  type: z.enum(['tournament', 'schedule', 'result', 'system']).default('system'),
  visibility: z.enum(['public', 'targeted']).default('public'),
  targetUserIds: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  targetRoles: z.array(z.enum(['admin', 'organizer', 'captain', 'player', 'referee'])).max(5).default([]),
}).refine((value) => value.visibility === 'public' || value.targetUserIds.length > 0 || value.targetRoles.length > 0, {
  message: 'Una notificación dirigida necesita usuarios o roles', path: ['targetUserIds'],
});
const venueBody = z.object({ name: z.string().trim().min(3).max(160), city: z.string().trim().min(2).max(100), country: z.string().trim().min(2).max(100), address: z.string().trim().min(3).max(240), latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180), activeEventsCount: z.coerce.number().int().min(0).default(0), image: z.string().url().optional(), features: z.array(z.string().trim().min(1).max(80)).max(20).default([]) });

router.get('/venues', (_req, res) => res.json(store.listVenues()));
router.post('/venues', authenticate, authorize('admin', 'organizer'), (req, res, next) => { const parsed = venueBody.safeParse(req.body); if (!parsed.success) return next(Object.assign(new Error('Sede no válida'), { status: 400, details: parsed.error.flatten() })); return res.status(201).json(store.createVenue(parsed.data)); });
router.patch('/venues/:id', authenticate, authorize('admin', 'organizer'), (req, res, next) => { const parsed = venueBody.partial().safeParse(req.body); if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return next(Object.assign(new Error('Cambios de sede no válidos'), { status: 400 })); const venue = store.updateVenue(req.params.id, parsed.data); if (!venue) return next(Object.assign(new Error('Sede no encontrada'), { status: 404 })); return res.json(venue); });
router.delete('/venues/:id', authenticate, authorize('admin', 'organizer'), (req, res, next) => { const result = store.removeVenue(req.params.id); if (result.error) return next(Object.assign(new Error(result.error), { status: result.status })); return res.status(204).end(); });
router.get('/nearby', (req, res, next) => {
  const parsed = nearbyQuery.safeParse(req.query);
  if (!parsed.success) return next(Object.assign(new Error('Ubicación o radio no válidos'), { status: 400, details: parsed.error.flatten() }));
  const { lat, lng, radiusKm } = parsed.data;
  return res.json(store.nearbyVenues(lat, lng, radiusKm));
});

router.get('/notifications', (_req, res) => res.json(store.notifications.filter((item) => !item.visibility || item.visibility === 'public').map(({ readBy: _readBy, ...item }) => ({ ...item, read: false })).reverse()));
router.get('/notifications/me', authenticate, (req, res) => { const role = String(req.user.role || '').toLowerCase(); res.json(store.notifications.filter((item) => !item.visibility || item.visibility === 'public' || item.targetUserIds?.includes(req.user.sub) || item.targetRoles?.includes(role)).map(({ readBy = [], ...item }) => ({ ...item, read: readBy.includes(req.user.sub) })).reverse()); });
router.patch('/notifications/:id/read', authenticate, (req, res, next) => { const notification = store.markNotificationRead(req.params.id, req.user.sub); if (!notification) return next(Object.assign(new Error('Notificación no encontrada'), { status: 404 })); const { readBy: _readBy, ...publicNotification } = notification; return res.json(publicNotification); });
router.post('/notifications', authenticate, authorize('admin', 'organizer'), (req, res, next) => {
  const parsed = notificationBody.safeParse(req.body);
  if (!parsed.success) return next(Object.assign(new Error('Notificación no válida'), { status: 400, details: parsed.error.flatten() }));
  const notification = publishNotification(req.app, parsed.data);
  return res.status(201).json(notification);
});

module.exports = router;
