const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/http-error');
const supabaseAuth = require('../services/supabase-auth');

async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Token de acceso requerido'));

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    req.authProvider = 'local';
    return next();
  } catch (_localError) {
    try {
      const user = await supabaseAuth.resolveUser(token);
      if (!user || user.status === 'SUSPENDED') return next(new HttpError(401, 'Token inválido o cuenta suspendida'));
      req.user = user;
      req.authProvider = 'supabase';
      req.supabaseAccessToken = token;
      return next();
    } catch (_supabaseError) {
      return next(new HttpError(401, 'Token inválido o expirado'));
    }
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
