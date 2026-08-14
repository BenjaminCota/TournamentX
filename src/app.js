const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sponsorsRoutes = require('./routes/sponsors.routes');
const prizePoolsRoutes = require('./routes/prize-pools.routes');
const receiptsRoutes = require('./routes/receipts.routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', module: 'rewards-payments' }));
app.use('/api/sponsors', sponsorsRoutes);
app.use('/api/prize-pools', prizePoolsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
