const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

const supabaseAuth = require('../src/services/supabase-auth');

test('resuelve una sesión de Supabase como identidad de TournamentX', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({
        id: 'supabase-user-1',
        email: 'captain@example.com',
        user_metadata: { name: 'Capitana Demo' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify([{
      id: 'supabase-user-1',
      email: 'captain@example.com',
      name: 'Capitana Demo',
      username: 'captain-demo',
      role: 'captain',
      status: 'ACTIVE',
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const user = await supabaseAuth.resolveUser('valid-access-token');

  assert.equal(user.sub, 'supabase-user-1');
  assert.equal(user.role, 'captain');
  assert.equal(user.status, 'ACTIVE');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-access-token');
  assert.equal(calls[1].options.headers.apikey, 'sb_publishable_test');
});

test('actualiza el rol en Supabase mediante la función administrativa', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify([{ id: 'supabase-user-2', role: 'organizer' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await supabaseAuth.updateProfile('admin-access-token', 'supabase-user-2', { role: 'organizer' });

  assert.match(request.url, /\/rest\/v1\/rpc\/admin_update_profile$/);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {
    target_id: 'supabase-user-2',
    new_role: 'organizer',
    new_status: null,
  });
});

test('lista todos los perfiles mediante la función administrativa', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify([
      { id: 'supabase-admin', name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'ACTIVE' },
      { id: 'supabase-player', name: 'Player', email: 'player@example.com', role: 'player', status: 'ACTIVE' },
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const profiles = await supabaseAuth.listProfiles('admin-access-token');

  assert.equal(profiles.length, 2);
  assert.match(request.url, /\/rest\/v1\/rpc\/admin_list_profiles$/);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer admin-access-token');
});
