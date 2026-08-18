const crypto = require('node:crypto');
const db = require('../config/database');
const HttpError = require('../utils/http-error');
const { assertOrganizerOwnership } = require('../utils/resource-ownership');

async function importResults(req, res, next) {
  try {
    const { id: prizePoolId } = req.validated.params;
    const { tournamentId, source, winners } = req.validated.body;
    const recordedWinners = await db.transaction(async (client) => {
      const poolResult = await client.query('SELECT * FROM prize_pools WHERE id = $1 FOR UPDATE', [prizePoolId]);
      const prizePool = poolResult.rows[0];
      if (!prizePool) throw new HttpError(404, 'Bolsa de premios no encontrada');
      assertOrganizerOwnership(req, prizePool.created_by);
      if (prizePool.tournament_id !== tournamentId) throw new HttpError(409, 'El resultado no pertenece al torneo de esta bolsa');
      if (prizePool.status !== 'locked') throw new HttpError(409, 'La bolsa debe estar bloqueada antes de importar ganadores');

      const existingPayouts = await client.query('SELECT COUNT(*) AS total FROM payouts WHERE prize_pool_id = $1', [prizePoolId]);
      if (Number(existingPayouts.rows[0].total) > 0) throw new HttpError(409, 'La bolsa ya tiene pagos manuales registrados');
      const rulesResult = await client.query('SELECT position, amount FROM distribution_rules WHERE prize_pool_id = $1 ORDER BY position', [prizePoolId]);
      const rulePositions = rulesResult.rows.map((rule) => Number(rule.position));
      const winnerPositions = winners.map((winner) => winner.position).sort((a, b) => a - b);
      if (JSON.stringify(rulePositions) !== JSON.stringify(winnerPositions)) {
        throw new HttpError(400, 'Debe enviarse exactamente un ganador por cada posición configurada');
      }

      const importId = crypto.randomUUID();
      await client.query(
        `INSERT INTO tournament_result_imports (id, prize_pool_id, tournament_id, source, received_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [importId, prizePoolId, tournamentId, source, req.user.sub],
      );

      const created = [];
      for (const winner of winners) {
        const rule = rulesResult.rows.find((item) => Number(item.position) === winner.position);
        await client.query(
          `INSERT INTO tournament_winners (id, result_import_id, recipient_id, recipient_type, position)
           VALUES ($1,$2,$3,$4,$5)`,
          [crypto.randomUUID(), importId, winner.recipientId, winner.recipientType, winner.position],
        );
        created.push({ recipientId: winner.recipientId, recipientType: winner.recipientType, position: winner.position, amount: rule.amount, currency: prizePool.currency });
      }
      return created;
    });
    res.status(201).json({ data: { tournamentId, winners: recordedWinners }, payoutsPending: true });
  } catch (error) { next(error); }
}

module.exports = { importResults };
