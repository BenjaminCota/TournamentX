const HttpError = require('./http-error');

function normalizedRole(req) {
  return String(req.user?.role || '').toLowerCase();
}

function isAdmin(req) {
  return normalizedRole(req) === 'admin';
}

function isOrganizer(req) {
  return normalizedRole(req) === 'organizer';
}

function assertOrganizerOwnership(req, createdBy, message = 'Solo puedes administrar recursos de tus propios torneos') {
  if (isAdmin(req)) return;
  if (isOrganizer(req) && createdBy === req.user?.sub) return;
  throw new HttpError(403, message);
}

module.exports = { assertOrganizerOwnership, isAdmin, isOrganizer, normalizedRole };
