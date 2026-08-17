const router = require('express').Router();
const controller = require('./teams.controller');
const validate = require('../../middleware/validate');
const schemas = require('./teams.schemas');

router.get('/', controller.listTeams);
router.post('/', validate(schemas.createTeam), controller.createTeam);
router.get('/:id', controller.getTeam);
router.patch('/:id', validate(schemas.updateTeam), controller.updateTeam);
router.post('/:id/roster', validate(schemas.roster), controller.addRosterMember);
router.delete('/:id/roster/:playerId', controller.removeRosterMember);

module.exports = router;
