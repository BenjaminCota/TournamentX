const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:4173',
  paymentsMode: process.env.PAYMENTS_MODE || 'simulated',
  stripeMode: process.env.STRIPE_MODE || 'simulated',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  binancePayMode: process.env.BINANCE_PAY_MODE || 'simulated',
  binancePayBaseUrl: process.env.BINANCE_PAY_BASE_URL,
  binancePayApiKey: process.env.BINANCE_PAY_API_KEY,
  binancePaySecretKey: process.env.BINANCE_PAY_SECRET_KEY,
  binancePayAllowProduction: process.env.BINANCE_PAY_ALLOW_PRODUCTION === 'true',
};
