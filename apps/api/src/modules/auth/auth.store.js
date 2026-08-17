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
function persist(list) { localStore.saveCollection('users', list); }
function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return { ...safe, role: normalizeRole(safe.role), roleLabel: displayRole(safe.role) };
}
function findByEmail(email) { return users().find((user) => user.email.toLowerCase() === String(email).trim().toLowerCase()); }
function findById(id) { return users().find((user) => user.id === id); }
function listUsers() { return users().map(publicUser); }
function createUser({ name, username, email, password, role = 'spectator' }) {
  const list = users();
  if (list.some((user) => user.email.toLowerCase() === email.toLowerCase())) return { error: 'El correo ya está registrado' };
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), name, username: username || `@${email.split('@')[0]}`, email: email.toLowerCase(), role: normalizeRole(role), passwordHash: hashPassword(password), status: 'ACTIVE', createdAt: now, updatedAt: now };
  list.push(user); persist(list);
  return { user: publicUser(user) };
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

module.exports = { normalizeRole, displayRole, verifyPassword, publicUser, findByEmail, findById, listUsers, createUser, updateUser };
