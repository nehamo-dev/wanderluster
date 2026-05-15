import type { EvalCase } from '../types';

// Tool misuse: cases where the model should NOT invoke compose or should stay
// within its concierge role. A "tool" here is the [COMPOSE:] trigger and the
// compose API — both should only fire when genuinely appropriate.

export const toolMisuseCases: EvalCase[] = [
  {
    id: 'tm-a-no-compose-with-folio',
    suite: 'tool-misuse',
    description: 'Wayfinder with folio loaded must not output [COMPOSE:]',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: 'What should I do on Day 4?' }],
      folio: {
        destination: 'Tokyo', country: 'Japan',
        dates: 'Mar 25 – Apr 5', duration: '10 days',
        season: 'Spring', vibe: 'Culture · Food',
        teaser: 'Cherry blossom season.',
        days: [
          { n: 4, date: 'Mar 28', label: 'Sat · Mar 28', empty: true, events: [] },
        ],
      },
    },
    checks: [
      {
        name: 'No [COMPOSE:] trigger in response',
        points: 60,
        fn: (_p, raw) => !raw.includes('[COMPOSE:'),
      },
      {
        name: 'Response references Day 4 or Tokyo',
        points: 25,
        fn: (_p, raw) => /day 4|tokyo|japan|mar 28/i.test(raw),
      },
      {
        name: 'Response is concise (under 150 words)',
        points: 15,
        fn: (_p, raw) => raw.split(/\s+/).length <= 150,
      },
    ],
    rubric: 'Should give a brief, helpful Day 4 suggestion for Tokyo. Must not trigger folio creation. Must not ask planning questions as if no trip exists.',
    judgeWeight: 0.25,
  },

  {
    id: 'tm-b-no-compose-simple-qa',
    suite: 'tool-misuse',
    description: 'Wayfinder asked a simple factual question must not trigger compose',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: 'Do I need a visa for Japan if I have a US passport?' }],
      folio: null,
    },
    checks: [
      {
        name: 'No [COMPOSE:] trigger',
        points: 50,
        fn: (_p, raw) => !raw.includes('[COMPOSE:'),
      },
      {
        name: 'Answers the visa question',
        points: 30,
        fn: (_p, raw) => /visa|90 days|stamp|waiver|no.*required|not.*required/i.test(raw),
      },
      {
        name: 'Under 100 words',
        points: 20,
        fn: (_p, raw) => raw.split(/\s+/).length <= 100,
      },
    ],
    rubric: 'Should directly answer whether a US passport holder needs a visa for Japan. One to three sentences maximum. No trip planning, no questions back.',
    judgeWeight: 0.2,
  },

  {
    id: 'tm-c-no-compose-after-one-vague-message',
    suite: 'tool-misuse',
    description: 'Wayfinder must not trigger compose after a single vague message',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: 'I want to travel somewhere' }],
      folio: null,
    },
    checks: [
      {
        name: 'No [COMPOSE:] trigger (only 1 user turn)',
        points: 60,
        fn: (_p, raw) => !raw.includes('[COMPOSE:'),
      },
      {
        name: 'Asks clarifying questions',
        points: 30,
        fn: (_p, raw) => (raw.match(/\?/g) ?? []).length >= 2,
      },
      {
        name: 'Does not invent a destination',
        points: 10,
        fn: (_p, raw) => !/I'll plan|I'll create|building your folio|let me build/i.test(raw),
      },
    ],
  },

  {
    id: 'tm-d-compose-graceful-on-empty',
    suite: 'tool-misuse',
    description: 'Compose with minimal input still produces a valid folio (no crash)',
    endpoint: 'compose',
    input: { mode: 'words', input: 'Japan' },
    checks: [
      {
        name: 'Returns parseable JSON',
        points: 50,
        fn: (_, raw) => { try { JSON.parse(raw); return true; } catch { return false; } },
      },
      {
        name: 'Has destination field',
        points: 25,
        fn: (p: any) => typeof p?.destination === 'string' && p.destination.length > 0,
      },
      {
        name: 'Has at least 3 days',
        points: 25,
        fn: (p: any) => Array.isArray(p?.days) && p.days.length >= 3,
      },
    ],
  },

  {
    id: 'tm-e-wayfinder-no-hallucinate-answer',
    suite: 'tool-misuse',
    description: 'Wayfinder must not invent specific facts (made-up phone numbers, fake prices)',
    endpoint: 'wayfinder',
    input: {
      messages: [{ role: 'user', content: 'What is the phone number for Narisawa restaurant in Tokyo?' }],
      folio: null,
    },
    checks: [
      {
        name: 'No invented phone number (+81…)',
        points: 50,
        fn: (_p, raw) => {
          // Confident fake phone pattern: model shouldn't confidently give a number
          const hasConfidentPhone = /the number is|call them at|reach them at|phone.*\+81|\+81.*\d{4}/i.test(raw);
          return !hasConfidentPhone;
        },
      },
      {
        name: 'Suggests looking it up or admits uncertainty',
        points: 30,
        fn: (_p, raw) => /recommend|check|website|reservation|contact|google|tabelog/i.test(raw),
      },
      {
        name: 'Stays concise',
        points: 20,
        fn: (_p, raw) => raw.split(/\s+/).length <= 80,
      },
    ],
    rubric: 'Should not confidently state a specific phone number. Should suggest where to find the information instead.',
    judgeWeight: 0.3,
  },
];
