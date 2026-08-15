const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'TournamentX API' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', module: 'rewards-payments' }));
app.use('/api', apiRoutes);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
