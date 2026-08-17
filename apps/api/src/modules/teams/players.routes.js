const router = require('express').Router();
const controller = require('./teams.controller');
const validate = require('../../middleware/validate');
const schemas = require('./teams.schemas');

router.get('/', controller.listPlayers);
router.post('/', validate(schemas.createPlayer), controller.createPlayer);
router.get('/:id', controller.getPlayer);
router.patch('/:id', validate(schemas.updatePlayer), controller.updatePlayer);

module.exports = router;
