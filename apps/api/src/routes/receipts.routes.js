const router = require('express').Router();
const db = require('../config/database');
const HttpError = require('../utils/http-error');

router.get('/:code', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.receipt_code AS "receiptCode", p.position, p.amount, p.currency, p.status,
       p.released_at AS "releasedAt", pp.name AS "prizePool" FROM payouts p
       JOIN prize_pools pp ON pp.id = p.prize_pool_id WHERE p.receipt_code = $1`,
      [req.params.code],
    );
    if (!rows[0]) throw new HttpError(404, 'Recibo no encontrado');
    res.json({ data: rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
