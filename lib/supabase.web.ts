import { createClient } from '@supabase/supabase-js';

// During `expo export` the SSR pass runs without browser env vars — fall back to
// a placeholder so createClient doesn't throw at module initialisation time.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const storage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') return Promise.resolve(null);
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === 'undefined') return Promise.resolve(undefined);
    return Promise.resolve(localStorage.setItem(key, value));
  },
  removeItem: (key: string) => {
    if (typeof localStorage === 'undefined') return Promise.resolve(undefined);
    return Promise.resolve(localStorage.removeItem(key));
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
