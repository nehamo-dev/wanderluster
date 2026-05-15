import type { EvalCase } from '../types';

// Response drift: replay the same prompt and check that the model's style,
// length, and key facts stay consistent. The runner executes these cases
// DRIFT_RUNS times and the checker compares across runs (stored in raw as JSON array).
//
// For the drift suite the endpoint is called DRIFT_RUNS=3 times; runner.ts
// passes all responses as a JSON array in `raw` for the checks to compare.

export const DRIFT_RUNS = 3;

export const driftCases: EvalCase[] = [
  {
    id: 'drift-a-question-count',
    suite: 'drift',
    description: 'Wayfinder always asks exactly 2-3 questions in first reply (not 1, not 4+)',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: 'I want to plan a trip' }],
      folio: null,
    },
    checks: [
      {
        name: 'All runs ask 2–3 questions',
        points: 60,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          const counts = responses.map(r => (r.match(/\?/g) ?? []).length);
          return counts.every(c => c >= 2 && c <= 4) ? 1 : counts.filter(c => c >= 2 && c <= 4).length / counts.length;
        },
      },
      {
        name: 'Response length consistent (±60 words across runs)',
        points: 20,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          const wordCounts = responses.map(r => r.split(/\s+/).length);
          const max = Math.max(...wordCounts);
          const min = Math.min(...wordCounts);
          return (max - min) <= 60;
        },
      },
      {
        name: 'No run mentions [COMPOSE:]',
        points: 20,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => !r.includes('[COMPOSE:'));
        },
      },
    ],
    rubric: 'Each response should ask 2-3 clear travel questions in a warm, concise tone. Deduct if verbose, if it asks just 1 question, or if tone is inconsistent across responses.',
    judgeWeight: 0.2,
  },

  {
    id: 'drift-b-folio-qa-style',
    suite: 'drift',
    description: 'Wayfinder with folio loaded stays concise and on-topic across runs',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: "What's the best ramen in Tokyo?" }],
      folio: {
        destination: 'Tokyo', country: 'Japan',
        dates: 'Mar 25 – Apr 5', duration: '10 days',
        season: 'Spring', vibe: 'Culture · Food · Slow mornings',
        teaser: 'Cherry blossom season in the capital.',
        days: [],
      },
    },
    checks: [
      {
        name: 'All runs mention ramen or Tokyo',
        points: 30,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => /ramen|tokyo|japan/i.test(r)) ? 1
            : responses.filter(r => /ramen|tokyo|japan/i.test(r)).length / responses.length;
        },
      },
      {
        name: 'No run triggers COMPOSE',
        points: 40,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => !r.includes('[COMPOSE:'));
        },
      },
      {
        name: 'Response under 120 words in all runs',
        points: 30,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => r.split(/\s+/).length <= 120) ? 1
            : responses.filter(r => r.split(/\s+/).length <= 120).length / responses.length;
        },
      },
    ],
    rubric: 'Response should be a concise 1-4 sentence recommendation about ramen in Tokyo. Deduct for off-topic content, excessive length, or triggering a new folio creation.',
    judgeWeight: 0.25,
  },

  {
    id: 'drift-c-compose-day-count',
    suite: 'drift',
    description: 'Compose always produces exactly the requested number of days',
    endpoint: 'compose',
    input: { mode: 'words', input: '7 days in Barcelona, Spain. Architecture and food. Solo. Late June.' },
    checks: [
      {
        name: 'All runs produce 7 days',
        points: 60,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          const counts = responses.map(r => {
            try { const p = JSON.parse(r); return (p?.days ?? []).length; } catch { return 0; }
          });
          return counts.every(c => c === 7) ? 1 : counts.filter(c => c === 7).length / counts.length;
        },
      },
      {
        name: 'Destination consistent across runs',
        points: 20,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => {
            try { return /barcelona/i.test(JSON.parse(r)?.destination ?? ''); } catch { return false; }
          });
        },
      },
      {
        name: 'All runs valid JSON',
        points: 20,
        fn: (_parsed, raw) => {
          const responses: string[] = JSON.parse(raw);
          return responses.every(r => { try { JSON.parse(r); return true; } catch { return false; } }) ? 1
            : responses.filter(r => { try { JSON.parse(r); return true; } catch { return false; } }).length / responses.length;
        },
      },
    ],
  },
];
