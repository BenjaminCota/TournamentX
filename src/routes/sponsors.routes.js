const router = require('express').Router();
const controller = require('../controllers/sponsors.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate);
router.get('/', controller.list);
router.get('/:id', validate(schemas.idParams), controller.getById);
router.post('/', authorize('admin', 'organizer'), validate(schemas.sponsor), controller.create);

module.exports = router;
