const router = require('express').Router();
const controller = require('./teams.controller');
const validate = require('../../middleware/validate');
const schemas = require('./teams.schemas');
const { authenticate, authorize } = require('../../middleware/auth');

const manager = [authenticate, authorize('admin', 'organizer', 'captain', 'player')];

router.get('/', controller.listPlayers);
router.post('/', ...manager, validate(schemas.createPlayer), controller.createPlayer);
router.get('/:id', controller.getPlayer);
router.patch('/:id', ...manager, controller.authorizePlayerOwner, validate(schemas.updatePlayer), controller.updatePlayer);

module.exports = router;
