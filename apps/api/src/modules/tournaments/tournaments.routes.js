const router = require('express').Router();
const controller = require('./tournaments.controller');

router.get('/', controller.listTournaments);
router.post('/', controller.createTournament);
router.get('/:id', controller.getTournament);

router.get('/:id/participants', controller.listParticipants);
router.post('/:id/participants', controller.registerParticipant);

router.get('/:id/groups', controller.getGroups);
router.post('/:id/groups/generate', controller.generateGroups);
router.put('/:id/group-matches/:matchId/result', controller.reportGroupMatchResult);

router.get('/:id/bracket', controller.getBracket);
router.post('/:id/bracket/generate', controller.generateBracket);
router.put('/:id/bracket-matches/:matchId/result', controller.reportBracketMatchResult);

router.get('/:id/status', controller.getStatus);

module.exports = router;
