const env = require('../config/env');

function configured() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

function headers(token, extra = {}) {
  return {
    apikey: env.supabasePublishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error_description || `Supabase respondió ${response.status}`);
  return body;
}

async function resolveUser(token) {
  if (!configured()) return null;
  const user = await readJson(await fetch(`${env.supabaseUrl}/auth/v1/user`, { headers: headers(token) }));
  const rows = await readJson(await fetch(`${env.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,name,username,email,role,status`, { headers: headers(token) }));
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile) throw new Error('El usuario autenticado no tiene perfil de TournamentX');
  return {
    sub: user.id,
    email: profile.email || user.email || '',
    name: profile.name || user.user_metadata?.name || 'Usuario TournamentX',
    username: profile.username || user.user_metadata?.username,
    role: profile.role || 'player',
    status: profile.status || 'ACTIVE',
  };
}

async function updateProfile(token, targetId, changes) {
  if (!configured()) return null;
  return readJson(await fetch(`${env.supabaseUrl}/rest/v1/rpc/admin_update_profile`, {
    method: 'POST',
    headers: headers(token, { Prefer: 'return=representation' }),
    body: JSON.stringify({ target_id: targetId, new_role: changes.role || null, new_status: changes.status || null }),
  }));
}

async function listProfiles(token) {
  if (!configured()) return [];
  const rows = await readJson(await fetch(`${env.supabaseUrl}/rest/v1/rpc/admin_list_profiles`, {
    method: 'POST',
    headers: headers(token),
    body: '{}',
  }));
  return Array.isArray(rows) ? rows : [];
}

module.exports = { configured, resolveUser, updateProfile, listProfiles };
