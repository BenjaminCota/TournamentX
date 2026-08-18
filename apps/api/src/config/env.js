const dotenv = require('dotenv');
const path = require('node:path');

const isNodeTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
const usesIntegrationDatabase = process.env.RUN_DB_TESTS === '1' || process.env.RUN_STRIPE_TESTS === '1';
if (!isNodeTest) dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: isNodeTest && !usesIntegrationDatabase ? undefined : process.env.DATABASE_URL,
  isTestRun: isNodeTest,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:4173',
  stripeMode: process.env.STRIPE_MODE || 'disabled',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || 'http://localhost:4173/?stripe_connect=return',
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || 'http://localhost:4173/?stripe_connect=refresh',
};
