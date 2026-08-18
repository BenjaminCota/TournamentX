const router = require('express').Router();
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const { authenticate, authorize } = require('../middleware/auth');
const { assertOrganizerOwnership } = require('../utils/resource-ownership');

router.use(authenticate, authorize('admin', 'organizer'));

router.get('/:code', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.receipt_code AS "receiptCode", p.position, p.amount, p.currency, p.status,
       p.platform_fee_percentage AS "platformFeePercentage", p.platform_fee_amount AS "platformFeeAmount",
       p.net_amount AS "netAmount", p.provider_reference AS "providerReference",
       p.released_at AS "releasedAt", pp.name AS "prizePool", pp.created_by AS "createdBy" FROM payouts p
       JOIN prize_pools pp ON pp.id = p.prize_pool_id WHERE p.receipt_code = $1`,
      [req.params.code],
    );
    if (!rows[0]) throw new HttpError(404, 'Recibo no encontrado');
    assertOrganizerOwnership(req, rows[0].createdBy);
    const { createdBy: _createdBy, ...receipt } = rows[0];
    res.json({ data: receipt });
  } catch (error) { next(error); }
});

module.exports = router;
