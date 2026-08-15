const router = require('express').Router();
const validate = require('../../middleware/validate');
const controller = require('./matches.controller');
const schemas = require('./matches.schemas');

router.get('/', validate(schemas.listMatches), controller.listMatches);
router.post('/', validate(schemas.createMatch), controller.createMatch);
router.get('/:id', validate(schemas.matchId), controller.getMatch);

module.exports = router;
