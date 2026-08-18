const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const service = require('./payment-settings.service');

router.use(authenticate);

router.get('/', authorize('admin', 'organizer'), async (_req, res, next) => {
  try { res.json({ data: await service.getSettings() }); } catch (error) { next(error); }
});

router.put('/', authorize('admin'), async (req, res, next) => {
  const parsed = z.object({ platformFeePercentage: z.coerce.number().min(0).max(30) }).safeParse(req.body);
  if (!parsed.success) return next(Object.assign(new Error('La comisión debe estar entre 0 y 30%'), { status: 400, details: parsed.error.flatten() }));
  try { return res.json({ data: await service.updateSettings(parsed.data.platformFeePercentage, req.user.sub) }); } catch (error) { return next(error); }
});

module.exports = router;
