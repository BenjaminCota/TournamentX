const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../../config/env');
const { authenticate, authorize } = require('../../middleware/auth');
const store = require('./auth.store');

const credentials = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(128) });
const registration = credentials.extend({ name: z.string().trim().min(2).max(100), username: z.string().trim().min(2).max(50).optional() });
const userUpdate = z.object({ name: z.string().trim().min(2).max(100).optional(), username: z.string().trim().min(2).max(50).optional(), email: z.string().trim().email().max(255).optional(), role: z.enum(['admin', 'organizer', 'referee', 'captain', 'player', 'spectator']).optional(), status: z.enum(['ACTIVE', 'OFFLINE', 'SUSPENDED']).optional(), password: z.string().min(8).max(128).optional() }).refine((body) => Object.keys(body).length > 0, 'Debes enviar al menos un cambio');
const organizerRequest = z.object({
  organizationName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.string().url().optional(),
  socialLinks: z.record(z.string().url()).optional(),
  credentialReference: z.string().trim().min(3).max(255),
});
const organizerDecision = z.object({ decision: z.enum(['approve', 'reject']), reviewNote: z.string().trim().max(500).optional() });

function parse(schema, value, next) {
  const result = schema.safeParse(value);
  if (!result.success) {
    next(Object.assign(new Error('Datos de autenticación no válidos'), { status: 400, details: result.error.flatten() }));
    return null;
  }
  return result.data;
}
function session(user) {
  const safe = store.publicUser(user);
  return { token: jwt.sign({ sub: safe.id, email: safe.email, role: safe.role, name: safe.name }, env.jwtSecret, { expiresIn: '8h', issuer: 'tournamentx-local' }), user: safe, expiresIn: 28800 };
}

router.post('/login', (req, res, next) => {
  const input = parse(credentials, req.body, next); if (!input) return;
  const user = store.findByEmail(input.email);
  if (!user || !store.verifyPassword(input.password, user.passwordHash)) return next(Object.assign(new Error('Correo o contraseña incorrectos'), { status: 401 }));
  if (user.status === 'SUSPENDED') return next(Object.assign(new Error('La cuenta está suspendida'), { status: 403 }));
  return res.json(session(user));
});
router.post('/register', (req, res, next) => {
  const input = parse(registration, req.body, next); if (!input) return;
  const result = store.createUser({ ...input, role: 'player' });
  if (result.error) return next(Object.assign(new Error(result.error), { status: 409 }));
  return res.status(201).json(session(store.findById(result.user.id)));
});
router.post('/organizer-requests', authenticate, authorize('player', 'captain', 'spectator'), (req, res, next) => {
  const input = parse(organizerRequest, req.body, next); if (!input) return;
  const result = store.createOrganizerRequest(req.user.sub, input);
  if (result.error) return next(Object.assign(new Error(result.error), { status: result.status }));
  return res.status(201).json(result);
});
router.get('/organizer-requests/me', authenticate, (req, res) => res.json({ data: store.listOrganizerRequests(req.user.sub) }));
router.get('/organizer-requests', authenticate, authorize('admin'), (_req, res) => res.json({ data: store.listOrganizerRequests() }));
router.patch('/organizer-requests/:id', authenticate, authorize('admin'), (req, res, next) => {
  const input = parse(organizerDecision, req.body, next); if (!input) return;
  const result = store.decideOrganizerRequest(req.params.id, { ...input, reviewedBy: req.user.sub });
  if (result.error) return next(Object.assign(new Error(result.error), { status: result.status }));
  return res.json(result);
});
router.get('/me', authenticate, (req, res, next) => {
  const user = store.findById(req.user.sub);
  if (!user) return next(Object.assign(new Error('Usuario no encontrado'), { status: 404 }));
  return res.json({ user: store.publicUser(user) });
});
router.get('/users', authenticate, authorize('admin'), (_req, res) => res.json({ data: store.listUsers() }));
router.patch('/users/:id', authenticate, authorize('admin'), (req, res, next) => {
  const input = parse(userUpdate, req.body, next); if (!input) return;
  const result = store.updateUser(req.params.id, input);
  if (!result) return next(Object.assign(new Error('Usuario no encontrado'), { status: 404 }));
  if (result.error) return next(Object.assign(new Error(result.error), { status: 409 }));
  return res.json(result);
});

module.exports = router;
