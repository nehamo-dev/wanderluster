import type { EvalCase } from '../types';

// Tests that compose never invents confirmed events the user didn't explicitly provide.
// These map to EVAL.md §1 Tests A–D, now machine-runnable.

export const hallucinationCases: EvalCase[] = [
  {
    id: 'hal-a-bare-city',
    suite: 'hallucination',
    description: 'Bare city + duration → all events must be suggested:true',
    endpoint: 'compose',
    input: { mode: 'words', input: '5 days in Tokyo, Japan. Culture and food. Late March.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 10,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Has days array',
        points: 10,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length > 0,
      },
      {
        name: 'No confirmed hotels (suggested:false)',
        points: 30,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const badHotels = events.filter((e: any) => e.kind === 'hotel' && e.suggested === false);
          return badHotels.length === 0;
        },
      },
      {
        name: 'No confirmed flights (suggested:false)',
        points: 30,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const badFlights = events.filter((e: any) => e.kind === 'flight' && e.suggested === false);
          return badFlights.length === 0;
        },
      },
      {
        name: 'All events are suggested:true',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.length > 0 && events.every((e: any) => e.suggested !== false);
        },
      },
    ],
  },

  {
    id: 'hal-b-flight-only',
    suite: 'hallucination',
    description: 'User provides one flight → only that flight is suggested:false',
    endpoint: 'compose',
    input: { mode: 'words', input: 'I have a flight BA016 LHR→NRT arriving March 25, and I want 7 days in Japan.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 10,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Flight BA016 present',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.some((e: any) => String(e.title ?? '').includes('BA016') || String(e.title ?? '').includes('LHR'));
        },
      },
      {
        name: 'BA016 is confirmed (suggested:false)',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const flight = events.find((e: any) => String(e.title ?? '').includes('BA016') || String(e.title ?? '').includes('LHR'));
          return flight?.suggested === false;
        },
      },
      {
        name: 'No other confirmed events',
        points: 30,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const nonFlightConfirmed = events.filter((e: any) =>
            e.suggested === false && !String(e.title ?? '').includes('BA016') && !String(e.title ?? '').includes('LHR')
          );
          return nonFlightConfirmed.length === 0;
        },
      },
      {
        name: '7 days present',
        points: 20,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length === 7,
      },
    ],
  },

  {
    id: 'hal-c-flight-and-hotel',
    suite: 'hallucination',
    description: 'User provides flight + hotel → exactly those two are confirmed',
    endpoint: 'compose',
    input: { mode: 'words', input: 'Flights: AA87 JFK→CDG departs June 10. Staying at Hotel Le Marais, Paris. 5 nights.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 10,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'AA87 flight confirmed',
        points: 25,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.some((e: any) => String(e.title ?? '').includes('AA87') && e.suggested === false);
        },
      },
      {
        name: 'Hotel Le Marais confirmed',
        points: 25,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.some((e: any) => String(e.title ?? '').toLowerCase().includes('le marais') && e.suggested === false);
        },
      },
      {
        name: 'No other confirmed events',
        points: 25,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const confirmed = events.filter((e: any) => e.suggested === false);
          const valid = confirmed.filter((e: any) =>
            String(e.title ?? '').includes('AA87') || String(e.title ?? '').toLowerCase().includes('le marais')
          );
          return confirmed.length === valid.length;
        },
      },
      {
        name: 'No invented second hotel',
        points: 15,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const confirmedHotels = events.filter((e: any) => e.kind === 'hotel' && e.suggested === false);
          return confirmedHotels.length <= 1;
        },
      },
    ],
  },

  {
    id: 'hal-d-restaurant-reservation',
    suite: 'hallucination',
    description: 'User has one restaurant booking → only that is suggested:false, at correct time',
    endpoint: 'compose',
    input: { mode: 'words', input: '5 days in Paris. I have dinner booked at Guy Savoy on June 12 at 8pm.' },
    checks: [
      {
        name: 'Valid JSON',
        points: 10,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Guy Savoy confirmed',
        points: 30,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          return events.some((e: any) => String(e.title ?? '').toLowerCase().includes('guy savoy') && e.suggested === false);
        },
      },
      {
        name: 'Guy Savoy has time 20:00',
        points: 20,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const savoy = events.find((e: any) => String(e.title ?? '').toLowerCase().includes('guy savoy'));
          return savoy?.time === '20:00' || savoy?.time === '8:00 PM';
        },
      },
      {
        name: 'All other food events suggested',
        points: 25,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const otherFood = events.filter((e: any) =>
            e.kind === 'food' && !String(e.title ?? '').toLowerCase().includes('guy savoy')
          );
          return otherFood.every((e: any) => e.suggested !== false);
        },
      },
      {
        name: 'No other confirmed restaurants',
        points: 15,
        fn: (p: any) => {
          const events = (p?.days ?? []).flatMap((d: any) => d.events ?? []);
          const confirmedFood = events.filter((e: any) => e.kind === 'food' && e.suggested === false);
          return confirmedFood.length <= 1;
        },
      },
    ],
  },
];
