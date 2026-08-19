const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');
const { requestContext } = require('./middleware/observability');
const stripeWebhookController = require('./controllers/stripe-webhook.controller');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '100kb' }), stripeWebhookController.handle);
// Las evidencias se envían temporalmente como data URL. En el VPS conviene
// reemplazar este transporte por carga directa a almacenamiento privado.
app.use(express.json({ limit: '7mb' }));
app.use(requestContext);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.static(path.join(__dirname, '../public')));
if (env.nodeEnv !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'TournamentX API' }));
}

app.get('/api/health', (_req, res) => {
  const io = app.get('io');
  res.json({
    status: 'ok',
    app: 'TournamentX',
    storage: 'local-json',
    realtime: io ? { status: 'ready', connectedClients: io.engine.clientsCount } : { status: 'not-attached', connectedClients: 0 },
    integrations: {
      mysql: process.env.DATABASE_URL ? 'configured-for-schema-and-tests' : 'not-configured',
    },
    modules: 8,
  });
});
app.use('/api', apiRoutes);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
