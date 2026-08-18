const router = require('express').Router();
const validate = require('../../middleware/validate');
const controller = require('./schedules.controller');
const schemas = require('./schedules.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', validate(schemas.listSchedules), controller.listSchedules);
router.post('/', authenticate, authorize('admin', 'organizer'), validate(schemas.createSchedule), controller.createSchedule);
router.get('/:id', validate(schemas.scheduleId), controller.getSchedule);

module.exports = router;
