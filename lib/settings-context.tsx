import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from './storage';
import { supabase } from './supabase';

const SETTINGS_KEY = 'wl-settings';

/** Strip sensitive OAuth tokens before writing to any storage layer. */
function sanitizeForPersistence(s: UserSettings): UserSettings {
  const { googleAccessToken: _drop, ...safe } = s;
  return safe as UserSettings;
}

export interface UserSettings {
  name: string;
  avatarUrl?: string;   // base64 thumbnail, stored locally + in Supabase
  homeCity: string;
  homeCityCoords?: { lat: number; lng: number };
  travelPreferences: string;   // freeform note
  travelTags: string[];        // structured quick-add chips
  googleConnected: boolean;
  googleAccessToken?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  homeCity: '',
  travelPreferences: '',
  travelTags: [],
  googleConnected: false,
};

interface SettingsCtx {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = storage.get<UserSettings>(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  const userIdRef = useRef<string | null>(null);

  // ── Supabase helpers ─────────────────────────────────────────────────────

  async function loadFromSupabase(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.data as UserSettings;
  }

  async function saveToSupabase(userId: string, s: UserSettings) {
    await supabase.from('user_settings').upsert(
      { user_id: userId, data: s, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }

  // ── Auth subscription ────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function handleUser(userId: string | null, isAnon: boolean) {
      if (!mounted) return;
      userIdRef.current = isAnon ? null : userId;

      if (!userId || isAnon) {
        // Demo / anonymous mode — localStorage only
        const saved = storage.get<UserSettings>(SETTINGS_KEY);
        if (saved) setSettings(prev => ({ ...prev, ...saved }));
        return;
      }

      // Authenticated real user — load from Supabase
      const remoteSettings = await loadFromSupabase(userId);

      if (!mounted) return;

      if (remoteSettings) {
        const merged = { ...DEFAULT_SETTINGS, ...remoteSettings };
        setSettings(merged);
        storage.set(SETTINGS_KEY, merged);
      } else {
        // First login: migrate local settings to Supabase (never migrate tokens)
        const localSettings = storage.get<UserSettings>(SETTINGS_KEY);
        if (localSettings) {
          const merged = { ...DEFAULT_SETTINGS, ...localSettings };
          setSettings(merged);
          await saveToSupabase(userId, sanitizeForPersistence(merged));
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      handleUser(user?.id ?? null, !user?.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        storage.remove(SETTINGS_KEY);
        userIdRef.current = null;
        setSettings(DEFAULT_SETTINGS);
      } else {
        const user = session?.user;
        handleUser(user?.id ?? null, !user?.email);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── updateSettings ───────────────────────────────────────────────────────

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      // Never persist OAuth tokens — keep them in memory only
      const safe = sanitizeForPersistence(next);
      storage.set(SETTINGS_KEY, safe);
      const uid = userIdRef.current;
      if (uid) saveToSupabase(uid, safe);
      return next;
    });
  }, []);

  // Hydrate on mount in case SSR skipped the initializer
  useEffect(() => {
    const saved = storage.get<UserSettings>(SETTINGS_KEY);
    if (saved) setSettings(prev => ({ ...prev, ...saved }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
