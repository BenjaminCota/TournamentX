const crypto = require('node:crypto');

function requestContext(req, res, next) {
  const requestedId = req.get('x-request-id');
  req.requestId = requestedId && requestedId.length <= 100 ? requestedId : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

module.exports = { requestContext };
