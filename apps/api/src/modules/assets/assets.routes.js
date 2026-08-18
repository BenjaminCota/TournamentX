const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const privateAssets = require('../../services/private-assets');

const uploadSchema = z.object({
  dataUrl: z.string().min(20).max(7_000_000),
  fileName: z.string().trim().min(1).max(180),
  purpose: z.enum(['match-evidence', 'dispute-evidence', 'organizer-credential']),
  matchId: z.string().trim().min(1).max(120).optional(),
}).refine((value) => value.purpose === 'organizer-credential' || Boolean(value.matchId), { message: 'La evidencia del partido requiere matchId', path: ['matchId'] });

router.post('/', authenticate, authorize('admin', 'organizer', 'captain', 'player'), (req, res, next) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return next(Object.assign(new Error('Archivo de evidencia no válido'), { status: 400, details: parsed.error.flatten() }));
  const result = privateAssets.storeDataUrl({ ...parsed.data, ownerUserId: req.user.sub });
  if (result.error) return next(Object.assign(new Error(result.error), { status: result.status }));
  const access = privateAssets.signedAccess(result.asset.id);
  const accessUrl = `${req.protocol}://${req.get('host')}/api/assets/${result.asset.id}?expires=${access.expires}&signature=${access.signature}`;
  return res.status(201).json({ asset: { ...result.asset, accessUrl } });
});

router.get('/:id', (req, res, next) => {
  const resolved = privateAssets.resolveSigned(req.params.id, req.query.expires, req.query.signature);
  if (!resolved) return next(Object.assign(new Error('Enlace de evidencia inválido o expirado'), { status: 403 }));
  res.type(resolved.asset.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${resolved.asset.fileName.replace(/["\r\n]/g, '')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.sendFile(resolved.filePath);
});

module.exports = router;
