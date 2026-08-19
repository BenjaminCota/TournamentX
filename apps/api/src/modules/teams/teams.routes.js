const router = require('express').Router();
const controller = require('./teams.controller');
const validate = require('../../middleware/validate');
const schemas = require('./teams.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

// Un equipo nace con un capitán real: solo una cuenta Capitán puede fundarlo.
const creator = [authenticate, authorize('captain')];
const authenticated = [authenticate];

router.get('/', controller.listTeams);
router.post('/', ...creator, validate(schemas.createTeam), controller.createTeam);
router.get('/:id', controller.getTeam);
router.post('/join-requests', authenticate, authorize('player', 'captain'), validate(schemas.joinRequest), controller.requestToJoin);
router.patch('/:id', ...authenticated, controller.authorizeTeamManager, validate(schemas.updateTeam), controller.updateTeam);
router.delete('/:id', authenticate, authorize('admin'), controller.dissolveTeam);
router.post('/:id/roster', ...authenticated, controller.authorizeTeamManager, validate(schemas.roster), controller.addRosterMember);
router.delete('/:id/roster/:playerId', ...authenticated, controller.authorizeTeamManager, controller.removeRosterMember);
router.get('/:id/invitations', ...authenticated, controller.authorizeTeamManager, controller.listInvitations);
router.post('/:id/invitations', ...authenticated, controller.authorizeTeamManager, validate(schemas.invitation), controller.createInvitation);
router.get('/:id/join-requests', ...authenticated, controller.authorizeTeamManager, controller.listJoinRequests);
router.patch('/:id/join-requests/:requestId', ...authenticated, controller.authorizeTeamManager, validate(schemas.joinDecision), controller.decideJoinRequest);
router.patch('/:id/captain', ...authenticated, controller.authorizeTeamManager, validate(schemas.captainTransfer), controller.transferCaptain);

module.exports = router;
