import React, { createContext, useContext, useState } from 'react';
import { FOLIOS } from '../data/mock';
import type { Folio } from '../types';

interface FoliosCtx {
  planned: Folio[];
  addFolio: (folio: Folio) => string; // returns the id
}

export const FoliosContext = createContext<FoliosCtx>({
  planned: [],
  addFolio: () => '',
});

export function FoliosProvider({ children }: { children: React.ReactNode }) {
  const [planned, setPlanned] = useState<Folio[]>([]);

  function addFolio(raw: any): string {
    const id = `${(raw.destination ?? 'trip').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const folio: Folio = { ...raw, id, docs: raw.docs ?? [] };
    (FOLIOS as any)[id] = folio;
    setPlanned(prev => [folio, ...prev]);
    return id;
  }

  return (
    <FoliosContext.Provider value={{ planned, addFolio }}>
      {children}
    </FoliosContext.Provider>
  );
}

export const useFolios = () => useContext(FoliosContext);
