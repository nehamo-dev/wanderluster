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
}

export interface TripDay {
  n: number;
  date: string;
  label: string;
  confirmed?: boolean;
  empty?: boolean;
  events: TripEvent[];
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
