const router = require('express').Router();
const { z } = require('zod');
const { venues, notifications, nearbyVenues, saveNotifications } = require('./geolocation.store');

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(20000).default(250),
});

const notificationBody = z.object({
  title: z.string().trim().min(2).max(100),
  message: z.string().trim().min(2).max(300),
  type: z.enum(['tournament', 'schedule', 'result', 'system']).default('system'),
});

router.get('/venues', (_req, res) => res.json(venues));
router.get('/nearby', (req, res, next) => {
  const parsed = nearbyQuery.safeParse(req.query);
  if (!parsed.success) return next(Object.assign(new Error('Ubicación o radio no válidos'), { status: 400, details: parsed.error.flatten() }));
  const { lat, lng, radiusKm } = parsed.data;
  return res.json(nearbyVenues(lat, lng, radiusKm));
});

router.get('/notifications', (_req, res) => res.json([...notifications].reverse()));
router.post('/notifications', (req, res, next) => {
  const parsed = notificationBody.safeParse(req.body);
  if (!parsed.success) return next(Object.assign(new Error('Notificación no válida'), { status: 400, details: parsed.error.flatten() }));
  const notification = { id: `notif-${Date.now()}`, ...parsed.data, createdAt: new Date().toISOString() };
  notifications.push(notification);
  saveNotifications();
  req.app.get('io')?.to('notifications').emit('notification:new', notification);
  return res.status(201).json(notification);
});

module.exports = router;
