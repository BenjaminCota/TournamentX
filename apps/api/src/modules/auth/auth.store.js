const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const ROLE_ALIASES = {
  admin: 'admin', administrador: 'admin',
  organizer: 'organizer', organizador: 'organizer',
  referee: 'referee', arbitro: 'referee', 'árbitro': 'referee',
  captain: 'captain', capitan: 'captain', 'capitán': 'captain',
  player: 'player', jugador: 'player',
  spectator: 'spectator', espectador: 'spectator',
};

function normalizeRole(role) {
  return ROLE_ALIASES[String(role || '').trim().toLowerCase()] || 'spectator';
}

function displayRole(role) {
  return { admin: 'Admin', organizer: 'Organizador', referee: 'Árbitro', captain: 'Capitán', player: 'Jugador', spectator: 'Espectador' }[normalizeRole(role)];
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const seedUsers = [
  { id: 'user-admin', name: 'Administrador TournamentX', username: '@admin', email: 'admin@tournamentx.local', role: 'admin', passwordHash: hashPassword('Admin123!'), status: 'ACTIVE' },
  { id: 'user-organizer', name: 'Organizador Local', username: '@organizer', email: 'organizer@tournamentx.local', role: 'organizer', passwordHash: hashPassword('Organizer123!'), status: 'ACTIVE' },
  { id: 'user-captain', name: 'Capitán Luminex', username: '@captain', email: 'captain@tournamentx.local', role: 'captain', passwordHash: hashPassword('Captain123!'), status: 'ACTIVE' },
  { id: 'user-player', name: 'Jugador Local', username: '@player', email: 'player@tournamentx.local', role: 'player', passwordHash: hashPassword('Player123!'), status: 'ACTIVE' },
].map((user) => ({ ...user, createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z' }));

function users() { return localStore.collection('users', seedUsers); }
function organizerRequests() { return localStore.collection('organizerRequests', []); }
function persist(list) { localStore.saveCollection('users', list); }
function persistOrganizerRequests(list) { localStore.saveCollection('organizerRequests', list); }
function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return { ...safe, role: normalizeRole(safe.role), roleLabel: displayRole(safe.role) };
}
function findByEmail(email) { return users().find((user) => user.email.toLowerCase() === String(email).trim().toLowerCase()); }
function findById(id) { return users().find((user) => user.id === id); }
function listUsers() { return users().map(publicUser); }
function createUser({ name, username, email, password, role = 'player' }) {
  const list = users();
  if (list.some((user) => user.email.toLowerCase() === email.toLowerCase())) return { error: 'El correo ya está registrado' };
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), name, username: username || `@${email.split('@')[0]}`, email: email.toLowerCase(), role: normalizeRole(role), passwordHash: hashPassword(password), status: 'ACTIVE', createdAt: now, updatedAt: now };
  list.push(user); persist(list);
  return { user: publicUser(user) };
}

function upsertExternalUser({ id, name, username, email, role = 'player', status = 'ACTIVE' }) {
  const list = users();
  const now = new Date().toISOString();
  const existing = list.find((user) => user.id === id);
  if (existing) {
    Object.assign(existing, {
      name: name || existing.name,
      username: username || existing.username,
      email: String(email || existing.email).toLowerCase(),
      role: normalizeRole(role),
      status: status || existing.status,
      updatedAt: now,
      authProvider: 'supabase',
    });
    persist(list);
    return publicUser(existing);
  }
  const user = {
    id,
    name: name || 'Usuario TournamentX',
    username: username || `@${String(email || id).split('@')[0]}`,
    email: String(email || '').toLowerCase(),
    role: normalizeRole(role),
    status: status || 'ACTIVE',
    authProvider: 'supabase',
    createdAt: now,
    updatedAt: now,
  };
  list.push(user); persist(list);
  return publicUser(user);
}

function createOrganizerRequest(userId, input) {
  const user = findById(userId);
  if (!user) return { error: 'Usuario no encontrado', status: 404 };
  if (normalizeRole(user.role) === 'organizer') return { error: 'La cuenta ya es organizador', status: 409 };
  const list = organizerRequests();
  if (list.some((request) => request.userId === userId && request.status === 'PENDING')) {
    return { error: 'Ya existe una solicitud pendiente', status: 409 };
  }
  const now = new Date().toISOString();
  const request = {
    id: crypto.randomUUID(),
    userId,
    organizationName: input.organizationName,
    description: input.description || '',
    logoUrl: input.logoUrl || null,
    socialLinks: input.socialLinks || {},
    credentialReference: input.credentialReference,
    status: 'PENDING',
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  list.push(request);
  persistOrganizerRequests(list);
  return { request: { ...request, applicant: publicUser(user) } };
}

function listOrganizerRequests(userId) {
  return organizerRequests()
    .filter((request) => !userId || request.userId === userId)
    .map((request) => ({ ...request, applicant: publicUser(findById(request.userId)) }));
}

function decideOrganizerRequest(id, { decision, reviewNote, reviewedBy }) {
  const list = organizerRequests();
  const request = list.find((entry) => entry.id === id);
  if (!request) return { error: 'Solicitud no encontrada', status: 404 };
  if (request.status !== 'PENDING') return { error: 'La solicitud ya fue revisada', status: 409 };
  const now = new Date().toISOString();
  request.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  request.reviewNote = reviewNote || null;
  request.reviewedBy = reviewedBy;
  request.reviewedAt = now;
  request.updatedAt = now;
  persistOrganizerRequests(list);
  if (request.status === 'APPROVED') updateUser(request.userId, { role: 'organizer' });
  return { request: { ...request, applicant: publicUser(findById(request.userId)) } };
}
function updateUser(id, updates) {
  const list = users();
  const user = list.find((entry) => entry.id === id);
  if (!user) return null;
  if (updates.email && list.some((entry) => entry.id !== id && entry.email.toLowerCase() === updates.email.toLowerCase())) return { error: 'El correo ya está registrado' };
  Object.assign(user, updates, updates.role ? { role: normalizeRole(updates.role) } : {}, updates.password ? { passwordHash: hashPassword(updates.password) } : {}, { updatedAt: new Date().toISOString() });
  delete user.password;
  persist(list);
  return { user: publicUser(user) };
}

module.exports = {
  normalizeRole, displayRole, verifyPassword, publicUser, findByEmail, findById, listUsers, createUser, updateUser,
  upsertExternalUser,
  createOrganizerRequest, listOrganizerRequests, decideOrganizerRequest,
};
