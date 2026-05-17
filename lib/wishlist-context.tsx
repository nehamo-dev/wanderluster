import React, { createContext, useContext, useState, useEffect } from 'react';
import { WISHLIST } from '../data/mock';
import type { WishlistItem } from '../types';
import { storage } from './storage';

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

  useEffect(() => {
    storage.set(STORAGE_KEY, items);
  }, [items]);

  function addItem(item: WishlistItem) {
    setItems(prev => [item, ...prev]);
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <WishlistContext.Provider value={{ items, addItem, deleteItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
