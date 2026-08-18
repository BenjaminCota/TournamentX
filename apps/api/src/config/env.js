const dotenv = require('dotenv');
const path = require('node:path');

const isNodeTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
const usesIntegrationDatabase = process.env.RUN_DB_TESTS === '1' || process.env.RUN_STRIPE_TESTS === '1';
if (!isNodeTest) {
  // Configuración versionada para que todo el equipo use el mismo entorno de aula.
  dotenv.config({ path: path.resolve(__dirname, '../../classroom.env') });
  // Un .env local sigue siendo opcional y permite añadir secretos sin publicarlos.
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: isNodeTest && !usesIntegrationDatabase ? undefined : process.env.DATABASE_URL,
  isTestRun: isNodeTest,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:4173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  stripeMode: process.env.STRIPE_MODE || 'disabled',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || 'http://localhost:4173/?stripe_connect=return',
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || 'http://localhost:4173/?stripe_connect=refresh',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:4173',
  lobbyEncryptionKey: process.env.LOBBY_ENCRYPTION_KEY || process.env.JWT_SECRET || 'development-only-lobby-key',
  privateAssetSigningKey: process.env.PRIVATE_ASSET_SIGNING_KEY || process.env.JWT_SECRET || 'development-only-asset-key',
};
