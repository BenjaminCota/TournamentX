const router = require('express').Router();
const sponsorsRoutes = require('./sponsors.routes');
const prizePoolsRoutes = require('./prize-pools.routes');
const receiptsRoutes = require('./receipts.routes');
const contributionsRoutes = require('./contributions.routes');
const rewardsRoutes = require('./rewards.routes');

router.use('/sponsors', sponsorsRoutes);
router.use('/prize-pools', prizePoolsRoutes);
router.use('/receipts', receiptsRoutes);
router.use('/contributions', contributionsRoutes);
router.use('/rewards', rewardsRoutes);

module.exports = router;
