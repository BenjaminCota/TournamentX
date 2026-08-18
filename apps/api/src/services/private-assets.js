const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const env = require('../config/env');
const localStore = require('../config/local-store');

const assets = localStore.collection('privateAssets', []);
const assetDirectory = path.resolve(__dirname, '../../data/private-assets');
const allowedTypes = new Map([
  ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['application/pdf', 'pdf'],
]);

function persist() { localStore.saveCollection('privateAssets', assets); }
function signatureFor(id, expires) { return crypto.createHmac('sha256', env.privateAssetSigningKey).update(`${id}.${expires}`).digest('hex'); }

function storeDataUrl({ dataUrl, fileName, purpose, matchId, ownerUserId }) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl || '');
  if (!match || !allowedTypes.has(match[1])) return { error: 'Formato no permitido. Usa PNG, JPG, WEBP o PDF', status: 400 };
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) return { error: 'La evidencia debe pesar entre 1 byte y 5 MB', status: 413 };
  const id = crypto.randomUUID();
  const extension = allowedTypes.get(match[1]);
  fs.mkdirSync(assetDirectory, { recursive: true });
  fs.writeFileSync(path.join(assetDirectory, `${id}.${extension}`), buffer, { flag: 'wx' });
  const asset = { id, fileName: String(fileName || `evidencia.${extension}`).slice(0, 180), mimeType: match[1], extension, size: buffer.length, purpose, matchId, ownerUserId, createdAt: new Date().toISOString() };
  assets.push(asset); persist();
  return { asset: { ...asset } };
}

function signedAccess(id, ttlSeconds = 60 * 60 * 24) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { expires, signature: signatureFor(id, expires) };
}

function resolveSigned(id, expires, signature) {
  const asset = assets.find((entry) => entry.id === id);
  if (!asset || Number(expires) < Math.floor(Date.now() / 1000)) return null;
  const expected = signatureFor(id, expires);
  const supplied = String(signature || '');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  return { asset, filePath: path.join(assetDirectory, `${asset.id}.${asset.extension}`) };
}

module.exports = { storeDataUrl, signedAccess, resolveSigned };
