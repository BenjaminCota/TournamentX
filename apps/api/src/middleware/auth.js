const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Token de acceso requerido'));

  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret);
    return next();
  } catch (_error) {
    return next(new HttpError(401, 'Token inválido o expirado'));
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    const normalized = String(req.user?.role || '').toLowerCase();
    if (!roles.map((role) => String(role).toLowerCase()).includes(normalized)) return next(new HttpError(403, 'No tienes permiso para esta operación'));
    return next();
  };
}

module.exports = { authenticate, authorize };
