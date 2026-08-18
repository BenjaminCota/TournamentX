const store = require('./local-rewards.store');
const tournamentStore = require('../tournaments/tournament-store');
const env = require('../../config/env');
const db = require('../../config/database');
const crypto = require('node:crypto');
const paymentSettingsService = require('../payments/payment-settings.service');

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
    const percentage = Number(store.find('settings', 'platform')?.platformFeePercentage ?? 5);
    const amounts = paymentSettingsService.calculateAmounts(rule.amount, percentage);
    const payout = store.add('payouts', {
      id: store.id(), prizePoolId: pool.id, recipientId: winner.recipientId, position: 1,
      amount: amounts.grossAmount, platformFeePercentage: amounts.platformFeePercentage,
      platformFeeAmount: amounts.platformFeeAmount, netAmount: amounts.netAmount,
      currency: pool.currency, destination: `local:team:${winner.recipientId}`, providerReference: null,
      status: 'released', attemptCount: 1, lastError: null,
      receiptCode: `TX-${Date.now().toString(36).toUpperCase()}-1`, releasedBy, releasedAt: new Date().toISOString(),
    });
    store.add('payoutEvents', { id: store.id(), payoutId: payout.id, eventType: 'released', message: 'Premio enviado correctamente', performedBy: releasedBy, createdAt: new Date().toISOString() });
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
      const existing = await client.query(
        `SELECT tw.recipient_id AS "recipientId" FROM tournament_winners tw
         JOIN tournament_result_imports tri ON tri.id = tw.result_import_id
         WHERE tri.prize_pool_id = $1 AND tw.position = 1 LIMIT 1`,
        [pool.id],
      );
      if (existing.rows[0]) continue;
      const rules = await client.query('SELECT position, amount FROM distribution_rules WHERE prize_pool_id = $1 ORDER BY position', [pool.id]);
      const rule = rules.rows.find((entry) => Number(entry.position) === 1);
      if (!rule) continue;
      const importId = crypto.randomUUID();
      await client.query('INSERT INTO tournament_result_imports (id, prize_pool_id, tournament_id, source, received_by) VALUES ($1,$2,$3,$4,$5)', [importId, pool.id, tournamentId, 'official-match', releasedBy]);
      await client.query('INSERT INTO tournament_winners (id, result_import_id, recipient_id, recipient_type, position) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), importId, status.championId, 'team', 1]);
      released.push({ recipientId: status.championId, position: 1, amount: rule.amount, currency: pool.currency, status: 'pending' });
    }
    return released;
  });
}

async function releaseTournamentChampion(tournamentId, releasedBy) {
  if (env.databaseUrl) return releaseDatabaseTournamentChampion(tournamentId, releasedBy);
  return env.isTestRun ? releaseLocalTournamentChampion(tournamentId, releasedBy) : [];
}

module.exports = { releaseTournamentChampion };
