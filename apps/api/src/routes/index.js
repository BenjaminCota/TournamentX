const router = require('express').Router();
const sponsorsRoutes = require('./sponsors.routes');
const prizePoolsRoutes = require('./prize-pools.routes');
const receiptsRoutes = require('./receipts.routes');
const contributionsRoutes = require('./contributions.routes');
const rewardsRoutes = require('./rewards.routes');
const teamsRoutes = require('../modules/teams/teams.routes');
const playersRoutes = require('../modules/teams/players.routes');
const tournamentsRoutes = require('../modules/tournaments/tournaments.routes');
const matchesRoutes = require('../modules/matches/matches.routes');
const schedulesRoutes = require('../modules/matches/schedules.routes');

router.use('/sponsors', sponsorsRoutes);
router.use('/prize-pools', prizePoolsRoutes);
router.use('/receipts', receiptsRoutes);
router.use('/contributions', contributionsRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/teams', teamsRoutes);
router.use('/players', playersRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/matches', matchesRoutes);
router.use('/schedules', schedulesRoutes);

module.exports = router;
