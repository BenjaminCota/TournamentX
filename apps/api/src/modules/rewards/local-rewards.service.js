const store = require('./local-rewards.store');
const tournamentStore = require('../tournaments/tournament-store');
const env = require('../../config/env');
const db = require('../../config/database');
const crypto = require('node:crypto');

function releaseLocalTournamentChampion(tournamentId, releasedBy) {
  const status = tournamentStore.getStatus(tournamentId);
  if (status.status !== 'COMPLETED' || !status.championId) return [];

  const released = [];
  const pools = store.list('prizePools').filter((pool) => pool.tournamentId === tournamentId && pool.status === 'locked');
  for (const pool of pools) {
    const rule = store.list('distributionRules').find((entry) => entry.prizePoolId === pool.id && entry.position === 1);
    if (!rule) continue;
    const previous = store.list('payouts').find((entry) => entry.prizePoolId === pool.id && entry.position === 1);
    if (previous) { released.push(previous); continue; }

    let winner = store.list('winners').find((entry) => entry.prizePoolId === pool.id && entry.position === 1);
    if (!winner) {
      winner = store.add('winners', {
        id: store.id(), prizePoolId: pool.id, tournamentId, recipientId: status.championId,
        recipientType: 'team', position: 1, source: 'official-match', importedBy: releasedBy, importedAt: new Date().toISOString(),
      });
    }
    const payout = store.add('payouts', {
      id: store.id(), prizePoolId: pool.id, recipientId: winner.recipientId, position: 1,
      amount: rule.amount, currency: pool.currency, destination: `local:team:${winner.recipientId}`,
      status: 'released', receiptCode: `TX-${Date.now().toString(36).toUpperCase()}-1`, releasedBy, releasedAt: new Date().toISOString(),
    });
    const rules = store.list('distributionRules').filter((entry) => entry.prizePoolId === pool.id);
    const paidPositions = new Set(store.list('payouts').filter((entry) => entry.prizePoolId === pool.id).map((entry) => entry.position));
    if (rules.every((entry) => paidPositions.has(entry.position))) store.update('prizePools', pool.id, { status: 'distributed', updatedAt: new Date().toISOString() });
    released.push(payout);
  }
  return released;
}

async function releaseDatabaseTournamentChampion(tournamentId, releasedBy) {
  const status = tournamentStore.getStatus(tournamentId);
  if (status.status !== 'COMPLETED' || !status.championId) return [];
  return db.transaction(async (client) => {
    const pools = await client.query("SELECT id, currency FROM prize_pools WHERE tournament_id = $1 AND status = 'locked' FOR UPDATE", [tournamentId]);
    const released = [];
    for (const pool of pools.rows) {
      const existing = await client.query('SELECT id, recipient_id AS "recipientId", position, amount, currency, receipt_code AS "receiptCode" FROM payouts WHERE prize_pool_id = $1 AND position = 1', [pool.id]);
      if (existing.rows[0]) { released.push(existing.rows[0]); continue; }
      const rules = await client.query('SELECT position, amount FROM distribution_rules WHERE prize_pool_id = $1 ORDER BY position', [pool.id]);
      const rule = rules.rows.find((entry) => Number(entry.position) === 1);
      if (!rule) continue;
      const importId = crypto.randomUUID();
      await client.query('INSERT INTO tournament_result_imports (id, prize_pool_id, tournament_id, source, received_by) VALUES ($1,$2,$3,$4,$5)', [importId, pool.id, tournamentId, 'official-match', releasedBy]);
      await client.query('INSERT INTO tournament_winners (id, result_import_id, recipient_id, recipient_type, position) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), importId, status.championId, 'team', 1]);
      const payoutId = crypto.randomUUID();
      const receiptCode = `TX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await client.query('INSERT INTO payouts (id, prize_pool_id, recipient_id, position, amount, currency, destination, receipt_code, released_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [payoutId, pool.id, status.championId, 1, rule.amount, pool.currency, `local:team:${status.championId}`, receiptCode, releasedBy]);
      const pending = await client.query('SELECT COUNT(*) AS count FROM distribution_rules dr LEFT JOIN payouts p ON p.prize_pool_id = dr.prize_pool_id AND p.position = dr.position WHERE dr.prize_pool_id = $1 AND p.id IS NULL', [pool.id]);
      if (Number(pending.rows[0].count) === 0) await client.query("UPDATE prize_pools SET status = 'distributed', updated_at = NOW() WHERE id = $1", [pool.id]);
      released.push({ id: payoutId, recipientId: status.championId, position: 1, amount: rule.amount, currency: pool.currency, receiptCode });
    }
    return released;
  });
}

async function releaseTournamentChampion(tournamentId, releasedBy) {
  return env.databaseUrl ? releaseDatabaseTournamentChampion(tournamentId, releasedBy) : releaseLocalTournamentChampion(tournamentId, releasedBy);
}

module.exports = { releaseTournamentChampion };
