const router = require('express').Router();
const validate = require('../../middleware/validate');
const controller = require('./matches.controller');
const schemas = require('./matches.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', validate(schemas.listMatches), controller.listMatches);
router.post('/', validate(schemas.createMatch), controller.createMatch);
router.patch('/:id/score', authenticate, authorize('admin', 'organizer', 'referee', 'Admin', 'Organizador', 'Árbitro'), validate(schemas.updateMatchScore), controller.updateMatchScore);
router.get('/:id', validate(schemas.matchId), controller.getMatch);

module.exports = router;
