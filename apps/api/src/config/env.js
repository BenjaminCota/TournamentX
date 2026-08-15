const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:4173',
  paymentsMode: process.env.PAYMENTS_MODE || 'simulated',
};
