import React, { createContext, useContext, useState, useEffect } from 'react';
import { FOLIOS } from '../data/mock';
import type { Folio } from '../types';
import { storage } from './storage';

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

export function FoliosProvider({ children }: { children: React.ReactNode }) {
  const [planned, setPlanned] = useState<Folio[]>(() => {
    const saved = storage.get<Folio[]>(STORAGE_KEY);
    if (saved && Array.isArray(saved)) {
      // Inject persisted folios into the FOLIOS object for direct reads
      for (const folio of saved) {
        (FOLIOS as Record<string, Folio>)[folio.id] = folio;
      }
      return saved;
    }
    return [];
  });

  // Persist whenever planned changes
  useEffect(() => {
    storage.set(STORAGE_KEY, planned);
  }, [planned]);

  function addFolio(raw: Folio): string {
    const id = `${(raw.destination ?? 'trip').toString().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const folio: Folio = { ...raw, id, docs: raw.docs ?? [] };
    (FOLIOS as Record<string, Folio>)[id] = folio;
    setPlanned(prev => [folio, ...prev]);
    return id;
  }

  function deleteFolio(id: string) {
    delete (FOLIOS as Record<string, Folio>)[id];
    setPlanned(prev => prev.filter(f => f.id !== id));
  }

  function updateFolio(id: string, updated: Folio) {
    const folio = { ...updated, id };
    (FOLIOS as Record<string, Folio>)[id] = folio;
    setPlanned(prev => prev.map(f => (f.id === id ? folio : f)));
  }

  return (
    <FoliosContext.Provider value={{ planned, addFolio, deleteFolio, updateFolio }}>
      {children}
    </FoliosContext.Provider>
  );
}

export const useFolios = () => useContext(FoliosContext);
