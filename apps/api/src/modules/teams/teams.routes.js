const router = require('express').Router();
const controller = require('./teams.controller');

router.get('/', controller.listTeams);
router.post('/', controller.createTeam);
router.get('/:id', controller.getTeam);
router.patch('/:id', controller.updateTeam);
router.post('/:id/roster', controller.addRosterMember);
router.delete('/:id/roster/:playerId', controller.removeRosterMember);

module.exports = router;
