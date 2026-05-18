import { createContext, useContext } from 'react';

type ComposeMode = 'screenshots' | 'words' | 'link';

interface WayfinderCtx {
  openCompose: (kind: ComposeMode) => void;
  openWayfinder: (q?: string) => void;
  openWishlist: () => void;
  editFolio: (folioId: string) => void;
}

export const WayfinderContext = createContext<WayfinderCtx>({
  openCompose: () => {},
  openWayfinder: () => {},
  openWishlist: () => {},
  editFolio: () => {},
});

export const useWayfinder = () => useContext(WayfinderContext);
