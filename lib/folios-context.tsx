import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { FOLIOS } from '../data/mock';
import type { Folio } from '../types';
import { storage } from './storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'wl-planned';

interface FoliosCtx {
  planned: Folio[];
  addFolio: (folio: Folio) => string;
  deleteFolio: (id: string) => void;
  updateFolio: (id: string, updated: Folio) => void;
}

export const FoliosContext = createContext<FoliosCtx>({
  planned: [],
  addFolio: () => '',
  deleteFolio: () => {},
  updateFolio: () => {},
});

function injectIntoFoliosMap(folios: Folio[]) {
  for (const f of folios) {
    (FOLIOS as Record<string, Folio>)[f.id] = f;
  }
}

export function FoliosProvider({ children }: { children: React.ReactNode }) {
  const [planned, setPlanned] = useState<Folio[]>(() => {
    const saved = storage.get<Folio[]>(STORAGE_KEY);
    if (saved && Array.isArray(saved)) {
      injectIntoFoliosMap(saved);
      return saved;
    }
    return [];
  });

  const userIdRef = useRef<string | null>(null);

  // ── Supabase helpers ─────────────────────────────────────────────────────

  async function loadFromSupabase(userId: string): Promise<Folio[]> {
    const { data, error } = await supabase
      .from('folios')
      .select('id, data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row: { id: string; data: Folio }) => ({ ...row.data, id: row.id }));
  }

  async function migrateLocalToSupabase(userId: string, localFolios: Folio[]) {
    if (!localFolios.length) return;
    const rows = localFolios.map(f => ({ id: f.id, user_id: userId, data: f }));
    await supabase.from('folios').upsert(rows, { onConflict: 'id' });
  }

  async function upsertToSupabase(userId: string, folio: Folio) {
    await supabase.from('folios').upsert(
      { id: folio.id, user_id: userId, data: folio },
      { onConflict: 'id' }
    );
  }

  async function deleteFromSupabase(userId: string, id: string) {
    await supabase.from('folios').delete().eq('id', id).eq('user_id', userId);
  }

  // ── Auth subscription ────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    // isAnon: anonymous Supabase sessions (signInAnonymously) are treated as demo —
    // they have a userId but no email, and must never read/write real user data.
    async function handleUser(userId: string | null, isAnon: boolean) {
      if (!mounted) return;
      userIdRef.current = isAnon ? null : userId;

      if (!userId || isAnon) {
        // Demo / anonymous mode — localStorage only, no Supabase
        const saved = storage.get<Folio[]>(STORAGE_KEY);
        const folios = saved && Array.isArray(saved) ? saved : [];
        injectIntoFoliosMap(folios);
        setPlanned(folios);
        return;
      }

      // Authenticated real user — load from Supabase
      const localFolios = storage.get<Folio[]>(STORAGE_KEY) ?? [];
      const remoteFolios = await loadFromSupabase(userId);

      if (!mounted) return;

      if (remoteFolios.length === 0 && localFolios.length > 0) {
        // First login: migrate local data up
        await migrateLocalToSupabase(userId, localFolios);
        injectIntoFoliosMap(localFolios);
        setPlanned(localFolios);
        storage.set(STORAGE_KEY, localFolios);
      } else {
        injectIntoFoliosMap(remoteFolios);
        setPlanned(remoteFolios);
        storage.set(STORAGE_KEY, remoteFolios);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      handleUser(user?.id ?? null, !user?.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        storage.remove(STORAGE_KEY);
        userIdRef.current = null;
        setPlanned([]);
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

  // ── localStorage sync (always, as cache/fallback) ─────────────────────────

  useEffect(() => {
    storage.set(STORAGE_KEY, planned);
  }, [planned]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  function addFolio(raw: Folio): string {
    const id = `${(raw.destination ?? 'trip').toString().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const folio: Folio = { ...raw, id, docs: raw.docs ?? [] };
    (FOLIOS as Record<string, Folio>)[id] = folio;
    setPlanned(prev => [folio, ...prev]);
    // Background write to Supabase
    const uid = userIdRef.current;
    if (uid) upsertToSupabase(uid, folio);
    return id;
  }

  function deleteFolio(id: string) {
    delete (FOLIOS as Record<string, Folio>)[id];
    setPlanned(prev => prev.filter(f => f.id !== id));
    const uid = userIdRef.current;
    if (uid) deleteFromSupabase(uid, id);
  }

  function updateFolio(id: string, updated: Folio) {
    const folio = { ...updated, id };
    (FOLIOS as Record<string, Folio>)[id] = folio;
    setPlanned(prev => prev.map(f => (f.id === id ? folio : f)));
    const uid = userIdRef.current;
    if (uid) upsertToSupabase(uid, folio);
  }

  return (
    <FoliosContext.Provider value={{ planned, addFolio, deleteFolio, updateFolio }}>
      {children}
    </FoliosContext.Provider>
  );
}

export const useFolios = () => useContext(FoliosContext);
