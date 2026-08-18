const db = require('../config/database');
const stripeGateway = require('../services/stripe-gateway');
const { transitionContribution } = require('./contributions.controller');
const registrationPayments = require('../modules/registration-payments/registration-payments.controller');
const stripeConnectService = require('../modules/stripe-connect/stripe-connect.service');
const localRewardsService = require('../modules/rewards/local-rewards.service');
const env = require('../config/env');

const EVENT_STATUS = {
  'payment_intent.amount_capturable_updated': 'authorized',
  'payment_intent.succeeded': 'paid',
  'payment_intent.canceled': 'cancelled',
  'payment_intent.payment_failed': 'failed'
};

async function handle(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    const event = stripeGateway.constructWebhookEvent(req.body, signature);
    if (event.type === 'account.updated') {
      const account = stripeConnectService.updateFromWebhook(event.data.object);
      return res.json({ received: true, ignored: !account, resource: account ? 'connected-account' : undefined });
    }
    const status = EVENT_STATUS[event.type];
    if (!status) return res.json({ received: true, ignored: true });

    const providerReference = event.data.object.id;
    if (!env.databaseUrl) {
      const contribution = localRewardsService.transitionContributionFromWebhook(providerReference, status, event.type);
      if (contribution) return res.json({ received: true, resource: 'prize-contribution' });
      const registration = registrationPayments.transitionFromWebhook(providerReference, status, event.type);
      return res.json({ received: true, ignored: !registration, resource: registration ? 'tournament-registration' : undefined });
    }
    const result = await db.query('SELECT * FROM contributions WHERE provider = $1 AND provider_reference = $2', ['stripe', providerReference]);
    const contribution = result.rows[0];
    if (!contribution) {
      const registration = registrationPayments.transitionFromWebhook(providerReference, status, event.type);
      return res.json({ received: true, ignored: !registration, resource: registration ? 'tournament-registration' : undefined });
    }

    await db.transaction((client) => transitionContribution(client, contribution, status, 'stripe-webhook', event.type));
    res.json({ received: true });
  } catch (error) { next(error); }
}

module.exports = { handle, EVENT_STATUS };
