const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./registration-payments.controller');
const schemas = require('./registration-payments.schemas');

const captain = [authenticate, authorize('captain')];

router.post('/tournaments/:tournamentId/registrations/stripe', ...captain, validate(schemas.create), controller.create);
router.get('/tournaments/:tournamentId/registrations/me', ...captain, validate(schemas.tournament), controller.listMine);
router.get('/tournaments/:tournamentId/registrations/status', authenticate, authorize('captain', 'player'), validate(schemas.tournament), controller.listTeamStatus);
router.post('/registrations/:id/stripe/test-authorize', ...captain, validate(schemas.registration), controller.authorizeTest);
router.post('/registrations/:id/stripe/capture', ...captain, validate(schemas.registration), controller.capture);
router.post('/registrations/:id/stripe/cancel', ...captain, validate(schemas.registration), controller.cancel);

module.exports = router;
