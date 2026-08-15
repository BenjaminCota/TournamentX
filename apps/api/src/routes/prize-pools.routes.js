const router = require('express').Router();
const controller = require('../controllers/prize-pools.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/schemas');
const resultsController = require('../controllers/results.controller');

router.use(authenticate);
router.get('/', controller.list);
router.get('/:id', validate(schemas.idParams), controller.getById);
router.post('/', authorize('admin', 'organizer'), validate(schemas.prizePool), controller.create);
router.post('/:id/contributions', authorize('admin', 'organizer'), validate(schemas.contribution), controller.contribute);
router.put('/:id/distribution', authorize('admin', 'organizer'), validate(schemas.distribution), controller.defineDistribution);
router.post('/:id/payouts', authorize('admin', 'organizer'), validate(schemas.payout), controller.releasePayout);
router.post('/:id/cancel', authorize('admin', 'organizer'), validate(schemas.idParams), controller.cancel);
router.post('/:id/results', authorize('admin', 'organizer'), validate(schemas.tournamentResults), resultsController.importResults);

module.exports = router;
