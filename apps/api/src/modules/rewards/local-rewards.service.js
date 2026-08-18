const store = require('./local-rewards.store');
const tournamentStore = require('../tournaments/tournament-store');
const env = require('../../config/env');
const db = require('../../config/database');
const crypto = require('node:crypto');

const contributionTransitions = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'cancelled'],
  paid: ['refunded'],
  failed: [], cancelled: [], refunded: [],
};

function transitionContributionFromWebhook(providerReference, status, eventType) {
  const contribution = store.list('contributions').find((entry) => entry.providerReference === providerReference);
  if (!contribution) return null;
  if (contribution.status === status) return store.publicContribution(contribution);
  if (!contributionTransitions[contribution.status]?.includes(status)) return store.publicContribution(contribution);
  const previousStatus = contribution.status;
  if (status === 'paid') {
    const pool = store.find('prizePools', contribution.prizePoolId);
    if (pool) store.update('prizePools', pool.id, { fundedAmount: Number(pool.fundedAmount) + Number(contribution.amount), updatedAt: new Date().toISOString() });
  }
  store.update('contributions', contribution.id, { status });
  store.add('paymentEvents', {
    id: store.id(), contributionId: contribution.id, eventType,
    previousStatus, newStatus: status, performedBy: 'stripe-webhook', createdAt: new Date().toISOString(),
  });
  return store.publicContribution(store.find('contributions', contribution.id));
}

function synchronizeLocalTournamentPools() {
  const tournaments = tournamentStore.listTournaments();
  const tournamentIds = new Set(tournaments.map((tournament) => tournament.id));
  const pools = store.list('prizePools');
  const legacyCommunityPool = pools.find((pool) => pool.tournamentId === 'tour-community');
  const canonicalCommunity = tournaments.find((tournament) => tournament.id === 'tour-1')
    || tournaments.find((tournament) => tournament.name === 'TournamentX Community Cup');

  if (legacyCommunityPool && canonicalCommunity && !tournamentIds.has(legacyCommunityPool.tournamentId)) {
    store.update('prizePools', legacyCommunityPool.id, {
      tournamentId: canonicalCommunity.id,
      name: `Bolsa ${canonicalCommunity.name}`,
      targetAmount: Number(canonicalCommunity.prizeAmountUSD || legacyCommunityPool.targetAmount || 0) || null,
      updatedAt: new Date().toISOString(),
    });
  }

  for (const tournament of tournaments) {
    if (store.list('prizePools').some((pool) => pool.tournamentId === tournament.id)) continue;
    const prizeAmount = Math.max(0, Number(tournament.prizeAmountUSD || 0));
    const simulatedFunds = env.paymentsMode === 'simulated' || env.isTestRun ? prizeAmount : 0;
    const timestamp = new Date().toISOString();
    store.add('prizePools', {
      id: `pool-${tournament.id}`,
      tournamentId: tournament.id,
      name: `Bolsa ${tournament.name}`,
      currency: String(tournament.entryCurrency || 'USD').toUpperCase(),
      targetAmount: prizeAmount || null,
      fundedAmount: simulatedFunds,
      status: 'funding',
      createdBy: tournamentStore.getTournamentOwner(tournament.id) || 'user-admin',
      simulated: simulatedFunds > 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // Repara torneos finalizados antes de que existiera el flujo automático de
  // premios. Es idempotente: no duplica reglas ni ganadores ya preparados.
  for (const tournament of tournaments) {
    const status = tournamentStore.getStatus(tournament.id);
    if (status.status !== 'COMPLETED' || !status.championId) continue;
    const tournamentPools = store.list('prizePools')
      .filter((entry) => entry.tournamentId === tournament.id && ['funding', 'locked'].includes(entry.status));
    for (const pool of tournamentPools) {
      prepareLocalChampion(pool, status, 'system-recovery', 'completed-bracket');
    }
  }

  return store.list('prizePools');
}

function prepareLocalChampion(pool, status, preparedBy, source = 'official-match') {
  let rule = store.list('distributionRules').find((entry) => entry.prizePoolId === pool.id && entry.position === 1);
  if (!rule && Number(pool.fundedAmount) > 0) {
    rule = store.add('distributionRules', {
      id: store.id(), prizePoolId: pool.id, position: 1, percentage: 100,
      amount: Number(Number(pool.fundedAmount).toFixed(2)),
    });
  }
  if (!rule) return null;
  if (pool.status === 'funding') store.update('prizePools', pool.id, { status: 'locked', updatedAt: new Date().toISOString() });

  let winner = store.list('winners').find((entry) => entry.prizePoolId === pool.id && entry.position === 1);
  if (!winner) {
    winner = store.add('winners', {
      id: store.id(), prizePoolId: pool.id, tournamentId: pool.tournamentId,
      recipientId: status.championId, recipientType: 'team', position: 1,
      source, importedBy: preparedBy, importedAt: new Date().toISOString(),
    });
  }
  return { pool: store.find('prizePools', pool.id), winner, rule, status: 'claimable' };
}

function releaseLocalTournamentChampion(tournamentId, releasedBy) {
  synchronizeLocalTournamentPools();
  const status = tournamentStore.getStatus(tournamentId);
  if (status.status !== 'COMPLETED' || !status.championId) return [];

  const claimable = [];
  const pools = store.list('prizePools').filter((pool) => pool.tournamentId === tournamentId && ['funding', 'locked'].includes(pool.status));
  for (const pool of pools) {
    const prepared = prepareLocalChampion(pool, status, releasedBy);
    if (prepared) claimable.push(prepared);
  }
  return claimable;
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
  return releaseLocalTournamentChampion(tournamentId, releasedBy);
}

module.exports = {
  prepareLocalChampion,
  releaseTournamentChampion,
  synchronizeLocalTournamentPools,
  transitionContributionFromWebhook,
};
