const router = require('express').Router();
const controller = require('../controllers/contributions.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate);
router.get('/', controller.list);
router.get('/:id/history', validate(schemas.idParams), controller.history);
router.patch('/:id/status', authorize('admin', 'organizer'), validate(schemas.paymentStatus), controller.changeStatus);
router.post('/:id/stripe/capture', authorize('admin', 'organizer'), validate(schemas.idParams), controller.captureStripe);
router.post('/:id/stripe/cancel', authorize('admin', 'organizer'), validate(schemas.idParams), controller.cancelStripe);
router.post('/:id/stripe/test-authorize', authorize('admin', 'organizer'), validate(schemas.idParams), controller.authorizeStripeTest);
router.post('/:id/binance/simulate', authorize('admin', 'organizer'), validate(schemas.binanceSimulation), controller.simulateBinance);

module.exports = router;
