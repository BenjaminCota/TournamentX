const router = require('express').Router();
const controller = require('../controllers/contributions.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate);
router.get('/', controller.list);
router.get('/:id/history', validate(schemas.idParams), controller.history);
router.patch('/:id/status', authorize('admin', 'organizer'), validate(schemas.paymentStatus), controller.changeStatus);

module.exports = router;
