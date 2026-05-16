import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from './storage';

const SETTINGS_KEY = 'wl-settings';

export interface UserSettings {
  homeCity: string;
  travelPreferences: string;
  googleConnected: boolean;
  googleAccessToken?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  homeCity: '',
  travelPreferences: '',
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

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      storage.set(SETTINGS_KEY, next);
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
