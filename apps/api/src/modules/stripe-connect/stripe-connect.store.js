const localStore = require('../../config/local-store');

const COLLECTION = 'stripeConnectedAccounts';

function list() {
  return localStore.collection(COLLECTION, []);
}

function findByUserId(userId) {
  return list().find((account) => account.userId === userId) || null;
}

function findByStripeAccountId(stripeAccountId) {
  return list().find((account) => account.stripeAccountId === stripeAccountId) || null;
}

function save(record) {
  const records = list();
  const index = records.findIndex((account) => account.userId === record.userId);
  if (index === -1) records.push(record);
  else records[index] = record;
  localStore.saveCollection(COLLECTION, records);
  return { ...record };
}

module.exports = { findByUserId, findByStripeAccountId, save };
