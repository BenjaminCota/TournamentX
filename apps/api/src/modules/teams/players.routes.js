const router = require('express').Router();
const controller = require('./teams.controller');

router.get('/', controller.listPlayers);
router.post('/', controller.createPlayer);
router.get('/:id', controller.getPlayer);
router.patch('/:id', controller.updatePlayer);

module.exports = router;
