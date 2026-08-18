const router = require('express').Router();
const validate = require('../../middleware/validate');
const controller = require('./matches.controller');
const schemas = require('./matches.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', validate(schemas.listMatches), controller.listMatches);
router.post('/', authenticate, authorize('admin', 'organizer'), validate(schemas.createMatch), controller.createMatch);
router.patch('/:id/score', authenticate, authorize('admin', 'organizer', 'referee', 'Admin', 'Organizador', 'Árbitro'), validate(schemas.updateMatchScore), controller.updateMatchScore);
router.get('/:id/workflow', authenticate, validate(schemas.workflow), controller.getWorkflow);
router.post('/:id/check-in', authenticate, authorize('captain'), validate(schemas.checkIn), controller.checkIn);
router.post('/:id/reports', authenticate, authorize('captain'), validate(schemas.reportResult), controller.reportResult);
router.patch('/:id/reports/:reportId', authenticate, authorize('admin', 'organizer'), validate(schemas.reportDecision), controller.decideReport);
router.post('/:id/disputes', authenticate, authorize('captain'), validate(schemas.dispute), controller.createDispute);
router.get('/:id', validate(schemas.matchId), controller.getMatch);

module.exports = router;
