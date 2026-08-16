const crypto = require('node:crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const certificateSerial = crypto.createHash('md5').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');

function signNotification(body, timestamp = Date.now().toString(), nonce = crypto.randomBytes(16).toString('hex')) {
  const rawBody = JSON.stringify(body);
  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(payload), privateKey).toString('base64');
  return { rawBody, headers: { timestamp, nonce, certificateSerial, signature } };
}

function verifyNotification(rawBody, headers) {
  if (headers.certificateSerial !== certificateSerial) return false;
  const payload = `${headers.timestamp}\n${headers.nonce}\n${rawBody}\n`;
  return crypto.verify('RSA-SHA256', Buffer.from(payload), publicKey, Buffer.from(headers.signature, 'base64'));
}

function createOrder({ reference, amount, currency }) {
  const prepayId = `bp_test_${crypto.randomUUID()}`;
  return {
    providerReference: prepayId,
    status: 'pending',
    checkoutUrl: `/rewards?binanceOrder=${prepayId}`,
    qrContent: `binance://pay?prepayId=${prepayId}&amount=${amount}&currency=${currency}`,
    metadata: { simulated: true, environment: 'local', reference, protocol: 'Binance Pay C2B' },
  };
}

module.exports = { createOrder, signNotification, verifyNotification, certificateSerial };
