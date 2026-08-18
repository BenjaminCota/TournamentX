const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const now = '2026-08-16T00:00:00.000Z';
const seed = {
  sponsors: [{ id: 'sponsor-local-01', name: 'TournamentX Labs', contactEmail: 'sponsor@tournamentx.local', logoUrl: null, active: true, createdAt: now }],
  prizePools: [{ id: 'pool-local-01', tournamentId: 'tour-community', name: 'Bolsa Community Cup', currency: 'USD', targetAmount: 1000, fundedAmount: 0, status: 'funding', createdBy: 'user-admin', createdAt: now, updatedAt: now }],
  contributions: [],
  distributionRules: [], payouts: [], paymentEvents: [], payoutEvents: [],
  settings: [{ id: 'platform', platformFeePercentage: 5, updatedBy: null, updatedAt: now }],
  rewards: [{ id: 'reward-local-01', sponsorId: 'sponsor-local-01', prizePoolId: 'pool-local-01', rewardType: 'coupon', name: 'Gift card TournamentX', description: 'Premio digital local', quantity: 10, milestone: 'Top 8', active: true, createdBy: 'user-admin', createdAt: now }],
  rewardAssignments: [], winners: [], idempotency: [],
};

function collection(name) { return localStore.collection(`rewards_${name}`, seed[name] || []); }
function save(name, data) { return localStore.saveCollection(`rewards_${name}`, data); }
function publicContribution(item) { const sponsor = collection('sponsors').find((entry) => entry.id === item.sponsorId); return { ...item, sponsorName: sponsor?.name || 'Patrocinador' }; }
function poolDetails(pool) { return { ...pool, contributions: collection('contributions').filter((item) => item.prizePoolId === pool.id).map(publicContribution), distributionRules: collection('distributionRules').filter((item) => item.prizePoolId === pool.id).sort((a, b) => a.position - b.position), payouts: collection('payouts').filter((item) => item.prizePoolId === pool.id).sort((a, b) => a.position - b.position), winners: collection('winners').filter((item) => item.prizePoolId === pool.id) }; }
function list(name) { return collection(name); }
function add(name, item) { const data = collection(name); data.push(item); save(name, data); return item; }
function find(name, id) { return collection(name).find((item) => item.id === id); }
function update(name, id, changes) { const data = collection(name); const item = data.find((entry) => entry.id === id); if (!item) return null; Object.assign(item, changes); save(name, data); return item; }
function id() { return crypto.randomUUID(); }

module.exports = { collection, save, list, add, find, update, id, publicContribution, poolDetails };
