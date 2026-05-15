import { createContext, useContext } from 'react';

type ComposeMode = 'screenshots' | 'words' | 'link';

interface WayfinderCtx {
  openCompose: (kind: ComposeMode) => void;
  openWayfinder: (q?: string) => void;
}

export const WayfinderContext = createContext<WayfinderCtx>({
  openCompose: () => {},
  openWayfinder: () => {},
});

export const useWayfinder = () => useContext(WayfinderContext);
