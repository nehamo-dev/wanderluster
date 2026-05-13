export type PaletteKey = 'bone' | 'stone' | 'ivory' | 'ink';

export interface Palette {
  key: PaletteKey;
  name: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  sub: string;
  accent: string;
  hair: string;
  sheet: string;
  dock: string;
  dockBorder: string;
  dockText: string;
  dockMuted: string;
}

export const PALETTES: Record<PaletteKey, Palette> = {
  bone: {
    key: 'bone', name: 'Bone',
    bg: '#f1ebde', surface: '#f8f3e7', ink: '#1c1a17',
    muted: '#8a7f6e', sub: '#5c554a', accent: '#a8624c',
    hair: 'rgba(28,26,23,0.10)',
    sheet: '#f8f3e7',
    dock: 'rgba(28,26,23,0.86)', dockBorder: 'rgba(245,239,226,0.10)',
    dockText: '#f5efe2', dockMuted: 'rgba(245,239,226,0.55)',
  },
  stone: {
    key: 'stone', name: 'Stone & Sage',
    bg: '#e8e7e1', surface: '#f3f1ea', ink: '#1a1c1a',
    muted: '#7c8278', sub: '#525953', accent: '#5a6b56',
    hair: 'rgba(26,28,26,0.10)',
    sheet: '#f3f1ea',
    dock: 'rgba(26,28,26,0.86)', dockBorder: 'rgba(243,241,234,0.10)',
    dockText: '#f3f1ea', dockMuted: 'rgba(243,241,234,0.55)',
  },
  ivory: {
    key: 'ivory', name: 'Ivory',
    bg: '#ebe6d8', surface: '#f6f1e1', ink: '#2a2620',
    muted: '#8a8170', sub: '#5c554a', accent: '#7a5c3e',
    hair: 'rgba(42,38,32,0.10)',
    sheet: '#f6f1e1',
    dock: 'rgba(42,38,32,0.88)', dockBorder: 'rgba(246,241,225,0.12)',
    dockText: '#f6f1e1', dockMuted: 'rgba(246,241,225,0.55)',
  },
  ink: {
    key: 'ink', name: 'Ink & Gold',
    bg: '#161510', surface: '#1f1d17', ink: '#f0e8d6',
    muted: '#a39b85', sub: '#c4bca6', accent: '#c9a961',
    hair: 'rgba(240,232,214,0.12)',
    sheet: '#1f1d17',
    dock: 'rgba(240,232,214,0.94)', dockBorder: 'rgba(28,26,23,0.18)',
    dockText: '#1c1a17', dockMuted: 'rgba(28,26,23,0.55)',
  },
};

export const DEFAULT_PALETTE: Palette = PALETTES.bone;

// Trip destination palettes for procedural art
export interface TripPalette { a: string; b: string; c: string; accent: string }

export const TRIP_PALETTES: Record<string, TripPalette> = {
  tokyo: { a: '#f4d8d4', b: '#e8a6a0', c: '#3a2a32', accent: '#a8624c' },
  salzburg: { a: '#2a3a2c', b: '#5a3a2a', c: '#0f1a14', accent: '#c9a961' },
  yosemite: { a: '#c9a96b', b: '#5a6b4a', c: '#2a2620', accent: '#a8624c' },
  patagonia: { a: '#8a9aa0', b: '#3a4248', c: '#1a1f24', accent: '#8a9aa0' },
  kyoto: { a: '#c4a890', b: '#8a5a44', c: '#2a1e16', accent: '#c4a890' },
  lofoten: { a: '#a8b8c0', b: '#3a5a6a', c: '#0f1a22', accent: '#a8b8c0' },
  marrakech: { a: '#d4956b', b: '#a8482a', c: '#2a1a14', accent: '#d4956b' },
};
