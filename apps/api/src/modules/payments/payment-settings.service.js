const db = require('../../config/database');
const env = require('../../config/env');
const localRewardsStore = require('../rewards/local-rewards.store');

const DEFAULT_PLATFORM_FEE_PERCENTAGE = 5;

function normalize(row) {
  return {
    platformFeePercentage: Number(row?.platformFeePercentage ?? row?.platform_fee_percentage ?? DEFAULT_PLATFORM_FEE_PERCENTAGE),
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

async function getSettings() {
  if (!env.databaseUrl) {
    let settings = localRewardsStore.find('settings', 'platform');
    if (!settings) settings = localRewardsStore.add('settings', { id: 'platform', platformFeePercentage: DEFAULT_PLATFORM_FEE_PERCENTAGE, updatedBy: null, updatedAt: new Date().toISOString() });
    return normalize(settings);
  }
  const { rows } = await db.query(
    `SELECT platform_fee_percentage AS "platformFeePercentage", updated_at AS "updatedAt"
     FROM platform_payment_settings WHERE id = 'platform'`,
  );
  if (rows[0]) return normalize(rows[0]);
  await db.query("INSERT INTO platform_payment_settings (id, platform_fee_percentage) VALUES ('platform', $1)", [DEFAULT_PLATFORM_FEE_PERCENTAGE]);
  return { platformFeePercentage: DEFAULT_PLATFORM_FEE_PERCENTAGE, updatedAt: null };
}

async function updateSettings(platformFeePercentage, updatedBy) {
  const value = Number(platformFeePercentage);
  if (!env.databaseUrl) {
    const current = localRewardsStore.find('settings', 'platform');
    const data = { platformFeePercentage: value, updatedBy, updatedAt: new Date().toISOString() };
    if (current) localRewardsStore.update('settings', 'platform', data);
    else localRewardsStore.add('settings', { id: 'platform', ...data });
    return normalize(localRewardsStore.find('settings', 'platform'));
  }
  await db.query(
    `INSERT INTO platform_payment_settings (id, platform_fee_percentage, updated_by)
     VALUES ('platform', $1, $2)
     ON DUPLICATE KEY UPDATE platform_fee_percentage = VALUES(platform_fee_percentage), updated_by = VALUES(updated_by), updated_at = NOW()`,
    [value, updatedBy],
  );
  return getSettings();
}

function calculateAmounts(amount, platformFeePercentage) {
  const grossAmount = Number(Number(amount).toFixed(2));
  const feePercentage = Number(Number(platformFeePercentage).toFixed(2));
  const platformFeeAmount = Number((grossAmount * feePercentage / 100).toFixed(2));
  const netAmount = Number((grossAmount - platformFeeAmount).toFixed(2));
  return { grossAmount, platformFeePercentage: feePercentage, platformFeeAmount, netAmount };
}

module.exports = { getSettings, updateSettings, calculateAmounts, DEFAULT_PLATFORM_FEE_PERCENTAGE };
