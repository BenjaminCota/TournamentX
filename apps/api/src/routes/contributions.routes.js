const router = require('express').Router();
const controller = require('../controllers/contributions.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate, authorize('admin', 'organizer'));
router.get('/', controller.list);
router.get('/:id/history', validate(schemas.idParams), controller.history);
router.patch('/:id/status', validate(schemas.paymentStatus), controller.changeStatus);
router.post('/:id/stripe/capture', validate(schemas.idParams), controller.captureStripe);
router.post('/:id/stripe/cancel', validate(schemas.idParams), controller.cancelStripe);
router.post('/:id/stripe/refund', validate(schemas.idParams), controller.refundStripe);
router.post('/:id/stripe/test-authorize', validate(schemas.idParams), controller.authorizeStripeTest);

module.exports = router;
