const router = require('express').Router();
const controller = require('../controllers/rewards.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(authenticate);
router.get('/', controller.list);
router.get('/recipients/:id', validate(schemas.idParams), controller.recipientRewards);
router.post('/', authorize('admin', 'organizer'), validate(schemas.reward), controller.create);
router.post('/:id/assignments', authorize('admin', 'organizer'), validate(schemas.rewardAssignment), controller.assign);
router.patch('/assignments/:id', authorize('admin', 'organizer'), validate(schemas.rewardAssignmentStatus), controller.updateAssignment);

module.exports = router;
