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
const geolocationRoutes = require('../modules/geolocation/geolocation.routes');
const authRoutes = require('../modules/auth/auth.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const mediaRoutes = require('../modules/media/media.routes');
const competitiveDataRoutes = require('../modules/competitive-data/competitive-data.routes');
const env = require('../config/env');
const localRewardsRoutes = require('../modules/rewards/local-rewards.routes');
const registrationPaymentRoutes = require('../modules/registration-payments/registration-payments.routes');
const stripeConnectRoutes = require('../modules/stripe-connect/stripe-connect.routes');
const paymentSettingsRoutes = require('../modules/payments/payment-settings.routes');
const assetsRoutes = require('../modules/assets/assets.routes');

if (env.databaseUrl) {
  router.use('/sponsors', sponsorsRoutes);
  router.use('/prize-pools', prizePoolsRoutes);
  router.use('/receipts', receiptsRoutes);
  router.use('/contributions', contributionsRoutes);
  router.use('/rewards', rewardsRoutes);
} else {
  router.use('/', localRewardsRoutes);
}
router.use('/teams', teamsRoutes);
router.use('/players', playersRoutes);
router.use('/', registrationPaymentRoutes);
router.use('/stripe/connect', stripeConnectRoutes);
router.use('/payment-settings', paymentSettingsRoutes);
router.use('/assets', assetsRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/matches', matchesRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/geolocation', geolocationRoutes);
router.use('/auth', authRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/media', mediaRoutes);
router.use('/competitive', competitiveDataRoutes);

module.exports = router;
