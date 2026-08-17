const router = require('express').Router();
const { competitiveOverview } = require('./competitive-data.providers');

router.get('/overview', async (_req, res, next) => {
  try { res.json(await competitiveOverview()); }
  catch (error) { next(error); }
});

module.exports = router;
