import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { WISHLIST } from '../data/mock';
import type { WishlistItem } from '../types';
import { storage } from './storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'wl-wishlist';

interface WishlistCtx {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  deleteItem: (id: string) => void;
}

export const WishlistContext = createContext<WishlistCtx>({
  items: WISHLIST,
  addItem: () => {},
  deleteItem: () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    const saved = storage.get<WishlistItem[]>(STORAGE_KEY);
    return saved && Array.isArray(saved) ? saved : WISHLIST;
  });

  const userIdRef = useRef<string | null>(null);

  // ── Supabase helpers ─────────────────────────────────────────────────────

  async function loadFromSupabase(userId: string): Promise<WishlistItem[]> {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('id, data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row: { id: string; data: WishlistItem }) => ({ ...row.data, id: row.id }));
  }

  async function migrateLocalToSupabase(userId: string, localItems: WishlistItem[]) {
    // Only migrate user-created items (not mock items)
    const userItems = localItems.filter(i => !WISHLIST.find(w => w.id === i.id));
    if (!userItems.length) return;
    const rows = userItems.map(i => ({ id: i.id, user_id: userId, data: i }));
    await supabase.from('wishlist_items').upsert(rows, { onConflict: 'id' });
  }

  async function upsertToSupabase(userId: string, item: WishlistItem) {
    await supabase.from('wishlist_items').upsert(
      { id: item.id, user_id: userId, data: item },
      { onConflict: 'id' }
    );
  }

  async function deleteFromSupabase(userId: string, id: string) {
    await supabase.from('wishlist_items').delete().eq('id', id).eq('user_id', userId);
  }

  // ── Auth subscription ────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function handleUser(userId: string | null, isAnon: boolean) {
      if (!mounted) return;
      userIdRef.current = isAnon ? null : userId;

      if (!userId || isAnon) {
        // Demo / anonymous mode — localStorage only, fallback to mock
        const saved = storage.get<WishlistItem[]>(STORAGE_KEY);
        setItems(saved && Array.isArray(saved) ? saved : WISHLIST);
        return;
      }

      // Authenticated real user — load from Supabase
      const localItems = storage.get<WishlistItem[]>(STORAGE_KEY) ?? [];
      const remoteItems = await loadFromSupabase(userId);

      if (!mounted) return;

      if (remoteItems.length === 0) {
        await migrateLocalToSupabase(userId, localItems);
      }

      const merged = remoteItems.length > 0 ? remoteItems : localItems;
      setItems(merged.length > 0 ? merged : WISHLIST);
      storage.set(STORAGE_KEY, merged.length > 0 ? merged : WISHLIST);
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      handleUser(user?.id ?? null, !user?.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        storage.remove(STORAGE_KEY);
        userIdRef.current = null;
        setItems(WISHLIST);
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

  // ── localStorage sync ────────────────────────────────────────────────────

  useEffect(() => {
    storage.set(STORAGE_KEY, items);
  }, [items]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  function addItem(item: WishlistItem) {
    setItems(prev => [item, ...prev]);
    const uid = userIdRef.current;
    if (uid) upsertToSupabase(uid, item);
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
    const uid = userIdRef.current;
    if (uid) deleteFromSupabase(uid, id);
  }

  return (
    <WishlistContext.Provider value={{ items, addItem, deleteItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
