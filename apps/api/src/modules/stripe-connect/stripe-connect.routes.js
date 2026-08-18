const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const authStore = require('../auth/auth.store');
const HttpError = require('../../utils/http-error');
const service = require('./stripe-connect.service');

router.use(authenticate, authorize('captain'));

function currentCaptain(req) {
  const user = authStore.findById(req.user.sub);
  if (!user) throw new HttpError(404, 'Cuenta de capitán no encontrada');
  return { id: user.id, email: user.email, name: user.name };
}

router.get('/status', async (req, res, next) => {
  try {
    const user = currentCaptain(req);
    res.json({ data: await service.getStatus(user.id) });
  } catch (error) { next(error); }
});

router.post('/onboarding-link', async (req, res, next) => {
  try {
    res.status(201).json({ data: await service.createOnboardingLink(currentCaptain(req)) });
  } catch (error) { next(error); }
});

router.post('/dashboard-link', async (req, res, next) => {
  try {
    const user = currentCaptain(req);
    res.json({ data: await service.createDashboardLink(user.id) });
  } catch (error) { next(error); }
});

module.exports = router;
