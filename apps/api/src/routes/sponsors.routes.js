const router = require('express').Router();
const controller = require('../controllers/sponsors.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate, authorize('admin', 'organizer'));
router.get('/', controller.list);
router.get('/:id', validate(schemas.idParams), controller.getById);
router.post('/', validate(schemas.sponsor), controller.create);
router.patch('/:id', validate(schemas.sponsorUpdate), controller.update);

module.exports = router;
