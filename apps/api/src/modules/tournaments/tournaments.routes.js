const router = require('express').Router();
const controller = require('./tournaments.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const manager = [authenticate, authorize('admin', 'organizer')];

router.get('/', controller.listTournaments);
router.post('/', ...manager, controller.createTournament);
router.get('/:id', controller.getTournament);

router.get('/:id/participants', controller.listParticipants);
router.post('/:id/participants', ...manager, controller.registerParticipant);

router.get('/:id/groups', controller.getGroups);
router.post('/:id/groups/generate', ...manager, controller.generateGroups);
router.put('/:id/group-matches/:matchId/result', ...manager, controller.reportGroupMatchResult);

router.get('/:id/bracket', controller.getBracket);
router.post('/:id/bracket/generate', ...manager, controller.generateBracket);
router.put('/:id/bracket-matches/:matchId/result', ...manager, controller.reportBracketMatchResult);

router.get('/:id/status', controller.getStatus);

module.exports = router;
