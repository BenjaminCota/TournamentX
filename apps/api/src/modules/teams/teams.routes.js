const router = require('express').Router();
const controller = require('./teams.controller');
const validate = require('../../middleware/validate');
const schemas = require('./teams.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

const manager = [authenticate, authorize('admin', 'organizer')];

router.get('/', controller.listTeams);
router.post('/', ...manager, validate(schemas.createTeam), controller.createTeam);
router.get('/:id', controller.getTeam);
router.patch('/:id', ...manager, validate(schemas.updateTeam), controller.updateTeam);
router.post('/:id/roster', ...manager, validate(schemas.roster), controller.addRosterMember);
router.delete('/:id/roster/:playerId', ...manager, controller.removeRosterMember);

module.exports = router;
