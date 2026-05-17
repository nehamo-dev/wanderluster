import type { TripPalette } from '../constants/theme';

export type EventKind = 'flight' | 'hotel' | 'food' | 'activity' | 'transport' | 'flag';
export type VibeTag = 'adventure' | 'food' | 'culture' | 'family' | 'solo' | 'beach' | 'nature';
export type VisaComplexity = 'easy' | 'moderate' | 'complex';

export interface TripEvent {
  kind: EventKind;
  time: string | null;
  title: string;
  meta: string;
  confirmed: boolean;
  alert?: boolean;
  suggested?: boolean;
  tips?: string[];       // insider notes, must-orders, queue warnings
  location?: string;     // neighbourhood or address for map link
  rating?: number;       // 0–5
  reason?: string;       // why this was suggested
  routeNote?: string;    // flight only: "Direct · ~11h", "Via FRA · ~14h", "No direct — via London"
  routeType?: 'direct' | 'connecting' | 'surface'; // flight routing type
}

export interface TripDay {
  n: number;
  date: string;
  label: string;
  confirmed?: boolean;
  empty?: boolean;
  events: TripEvent[];
  theme?: string;        // e.g. "Explore Yanaka", "Day trip · Nikko", "Rest day"
  area?: string;         // primary neighbourhood focus for the day
  photoQuery?: string;   // 2-3 word Unsplash search term for the day's hero image
}

export interface TripDoc {
  name: string;
  state: string;
}

export interface Folio {
  id: string;
  title: string;
  destination: string;
  country: string;
  dates: string;
  duration: string;
  season: string;
  vibe: string;
  palette: TripPalette;
  visa: { label: string; status: string } | null;
  teaser: string;
  tldr?: string;         // one paragraph: what to expect overall
  highlights?: string[]; // 3–5 bullet points
  days: TripDay[];
  docs: TripDoc[];
}

export interface WishlistItem {
  id: string;
  name: string;
  season: string;
  vibe: string;
  flight: string;
  visa: string;
  budget: string;
  palette: { a: string; b: string; c: string };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'wayfinder';
  text?: string;
  kind?: 'upload' | 'attachments' | 'parsed' | 'folio-draft';
  uploadName?: string;
  items?: { type: string; name: string }[];
  summary?: string;
  action?: string;
  fields?: { k: string; v: string }[];
  folio?: {
    destination: string;
    country: string;
    dates: string;
    duration: string;
    vibe: string;
    events: { kind: string; label: string; date: string }[];
  };
  next?: string;
}
