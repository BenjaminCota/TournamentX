const db = require('../config/database');
const stripeGateway = require('../services/stripe-gateway');
const { transitionContribution } = require('./contributions.controller');

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
    const status = EVENT_STATUS[event.type];
    if (!status) return res.json({ received: true, ignored: true });

    const providerReference = event.data.object.id;
    const result = await db.query('SELECT * FROM contributions WHERE provider = $1 AND provider_reference = $2', ['stripe', providerReference]);
    const contribution = result.rows[0];
    if (!contribution) return res.json({ received: true, ignored: true });

    await db.transaction((client) => transitionContribution(client, contribution, status, 'stripe-webhook', event.type));
    res.json({ received: true });
  } catch (error) { next(error); }
}

module.exports = { handle, EVENT_STATUS };
