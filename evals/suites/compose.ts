import type { EvalCase } from '../types';

// Core compose quality: JSON structure, date accuracy, location specificity,
// long-trip completeness. Maps to EVAL.md §§2-4.

export const composeCases: EvalCase[] = [
  {
    id: 'comp-a-json-validity',
    suite: 'compose',
    description: 'Compose output parses as valid JSON without sanitizer',
    endpoint: 'compose',
    input: { mode: 'words', input: '7 days in Barcelona, Spain. Food and architecture. Solo. Late June.' },
    checks: [
      {
        name: 'Raw response is valid JSON',
        points: 40,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Has destination string',
        points: 15,
        fn: (p: any) => typeof p?.destination === 'string' && p.destination.length > 1,
      },
      {
        name: 'Has 7 days',
        points: 20,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length === 7,
      },
      {
        name: 'No day has zero events',
        points: 15,
        fn: (p: any) => (p?.days ?? []).every((d: any) => (d.events ?? []).length > 0),
      },
      {
        name: 'Response does not truncate (ends with })',
        points: 10,
        fn: (_, raw) => raw.trimEnd().endsWith('}'),
      },
    ],
  },

  {
    id: 'comp-b-long-trip',
    suite: 'compose',
    description: '10-day multi-city trip completes without truncation',
    endpoint: 'compose',
    input: {
      mode: 'words',
      input: '10 days in Japan: Tokyo (5 nights), Kyoto (3 nights), Osaka (2 nights). Fly in March 20, fly out March 30. Flight: JL044.',
    },
    checks: [
      {
        name: 'Valid JSON',
        points: 20,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'All 10 days present',
        points: 30,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length === 10,
      },
      {
        name: 'JL044 flight present and confirmed',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.some((e: any) => String(e.title ?? '').includes('JL044') && e.suggested === false);
        },
      },
      {
        name: 'JSON closes properly (not truncated)',
        points: 20,
        fn: (_, raw) => raw.trimEnd().endsWith('}'),
      },
      {
        name: 'Destination mentions Japan or Tokyo',
        points: 10,
        fn: (p: any) => /japan|tokyo/i.test(String(p?.destination ?? '')),
      },
    ],
  },

  {
    id: 'comp-c-date-accuracy',
    suite: 'compose',
    description: 'Specific dates produce correct day-of-week labels',
    endpoint: 'compose',
    input: { mode: 'words', input: 'New York City, September 15–20 2026.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 20,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Sep 15 2026 labelled as Tuesday',
        points: 30,
        fn: (p: any) => {
          const day1 = (p?.days ?? [])[0];
          return /tue/i.test(String(day1?.label ?? '') + String(day1?.date ?? ''));
        },
      },
      {
        name: 'Sep 20 2026 labelled as Sunday',
        points: 30,
        fn: (p: any) => {
          const days = p?.days ?? [];
          const last = days[days.length - 1];
          return /sun/i.test(String(last?.label ?? '') + String(last?.date ?? ''));
        },
      },
      {
        name: 'Exactly 6 days produced',
        points: 20,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length === 6,
      },
    ],
  },

  {
    id: 'comp-d-location-quality',
    suite: 'compose',
    description: 'Event locations include city — not just venue name',
    endpoint: 'compose',
    input: { mode: 'words', input: '4 days in Kyoto, Japan. Temples, food, slow pace. Spring.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 20,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'At least 80% of locations include Kyoto or Japan',
        points: 40,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? [])
            .filter((e: any) => e.location);
          if (events.length === 0) return false;
          const withCity = events.filter((e: any) => /kyoto|japan/i.test(String(e.location)));
          return withCity.length / events.length >= 0.8;
        },
      },
      {
        name: 'No location is just a bare venue name (< 15 chars)',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? [])
            .filter((e: any) => e.location && typeof e.location === 'string');
          if (events.length === 0) return true;
          const tooShort = events.filter((e: any) => e.location.length < 15);
          return tooShort.length === 0;
        },
      },
      {
        name: 'Flights have no location field',
        points: 20,
        fn: (p: any) => {
          const flights = (p?.days ?? []).flatMap((d: any) => d.events ?? [])
            .filter((e: any) => e.kind === 'flight');
          return flights.every((e: any) => !e.location || e.location === '');
        },
      },
    ],
    rubric: 'Location strings should be specific enough to paste into Google Maps — e.g. "Kinkaku-ji, Kinkakuji-cho 1, Kita-ku, Kyoto" not just "Kinkaku-ji". Deduct for vague or incomplete addresses.',
    judgeWeight: 0.2,
  },
];
