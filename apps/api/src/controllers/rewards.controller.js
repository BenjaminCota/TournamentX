const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');

async function list(req, res, next) {
  try {
    const params = [];
    let where = '';
    if (req.query.prizePoolId) { params.push(req.query.prizePoolId); where = 'WHERE r.prize_pool_id = $1'; }
    const { rows } = await db.query(
      `SELECT r.id, r.sponsor_id AS "sponsorId", r.prize_pool_id AS "prizePoolId", r.reward_type AS "rewardType",
       r.name, r.description, r.quantity, r.milestone, r.active, r.created_at AS "createdAt",
       COUNT(a.id) AS "assignedQuantity" FROM reward_items r
       LEFT JOIN reward_assignments a ON a.reward_item_id = r.id AND a.status <> 'cancelled'
       ${where} GROUP BY r.id ORDER BY r.created_at DESC`,
      params,
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const id = crypto.randomUUID();
    const { sponsorId, prizePoolId, rewardType, name, description, quantity, milestone } = req.validated.body;
    await db.query(
      `INSERT INTO reward_items (id, sponsor_id, prize_pool_id, reward_type, name, description, quantity, milestone, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, sponsorId || null, prizePoolId || null, rewardType, name, description || null, quantity, milestone || null, req.user.sub],
    );
    const { rows } = await db.query('SELECT * FROM reward_items WHERE id = $1', [id]);
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

async function assign(req, res, next) {
  try {
    const assignment = await db.transaction(async (client) => {
      const rewardResult = await client.query('SELECT * FROM reward_items WHERE id = $1 AND active = TRUE FOR UPDATE', [req.validated.params.id]);
      const reward = rewardResult.rows[0];
      if (!reward) throw new HttpError(404, 'Premio no encontrado o inactivo');
      const countResult = await client.query("SELECT COUNT(*) AS total FROM reward_assignments WHERE reward_item_id = $1 AND status <> 'cancelled'", [reward.id]);
      if (Number(countResult.rows[0].total) >= reward.quantity) throw new HttpError(409, 'No quedan unidades disponibles');

      const id = crypto.randomUUID();
      const { recipientId, redemptionCode } = req.validated.body;
      const generatedCode = ['game_code', 'gift_card', 'coupon'].includes(reward.reward_type)
        ? (redemptionCode || `TX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`)
        : null;
      await client.query(
        `INSERT INTO reward_assignments (id, reward_item_id, recipient_id, redemption_code, assigned_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, reward.id, recipientId, generatedCode, req.user.sub],
      );
      const result = await client.query('SELECT * FROM reward_assignments WHERE id = $1', [id]);
      return result.rows[0];
    });
    res.status(201).json({ data: assignment });
  } catch (error) { next(error); }
}

async function updateAssignment(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { status } = req.validated.body;
    const result = await db.query('SELECT * FROM reward_assignments WHERE id = $1', [id]);
    if (!result.rows[0]) throw new HttpError(404, 'Asignación no encontrada');
    await db.query(
      `UPDATE reward_assignments SET status = $1, completed_at = CASE WHEN $1 IN ('redeemed','delivered') THEN NOW() ELSE completed_at END WHERE id = $2`,
      [status, id],
    );
    const updated = await db.query('SELECT * FROM reward_assignments WHERE id = $1', [id]);
    res.json({ data: updated.rows[0] });
  } catch (error) { next(error); }
}

async function recipientRewards(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.recipient_id AS "recipientId", a.redemption_code AS "redemptionCode", a.status,
       a.assigned_at AS "assignedAt", a.completed_at AS "completedAt", r.name, r.reward_type AS "rewardType",
       r.description, r.milestone FROM reward_assignments a JOIN reward_items r ON r.id = a.reward_item_id
       WHERE a.recipient_id = $1 ORDER BY a.assigned_at DESC`,
      [req.validated.params.id],
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

module.exports = { list, create, assign, updateAssignment, recipientRewards };
