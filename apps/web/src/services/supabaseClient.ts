import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'tournamentx-supabase-session',
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado en este entorno.');
  return supabase;
}
