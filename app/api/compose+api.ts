import Groq from 'groq-sdk';
import { extractAndParseFolio } from '../../lib/parseCompose';
import { requireAuth, checkRateLimit, rateLimitedResponse } from '../../lib/api-auth';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 10 compose calls per user per 10 minutes — generous for demo use
const RATE_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

// Max base64 image size ~3.7 MB decoded
const MAX_IMAGE_DATA_LEN = 5_000_000;

function buildSystem(): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return `You are a travel planning AI that creates detailed, opinionated trip itineraries.
Today's date is ${today}. Use this to calculate correct days of the week for all dates.

Given a trip description, create a complete day-by-day itinerary. Cluster each day geographically — events on the same day should be walkable or in the same neighbourhood where possible.

Return ONLY valid JSON. No markdown, no explanation. Exact shape:
{
  "destination": "City name",
  "title": "Short evocative trip title, 2–4 words",
  "country": "Country name",
  "dates": "Mon Mar 10 – Mon Mar 17",
  "duration": "7 days",
  "season": "Early spring",
  "vibe": "Culture · Food · Slow mornings",
  "teaser": "One atmospheric sentence about the feel of the trip.",
  "tldr": "Two or three sentences summarising what to expect overall — the rhythm, the highlights, the character of the trip.",
  "highlights": [
    "Cherry blossoms peak around Day 3 — timing is everything",
    "Kaiseki dinner at Narisawa is the culinary centrepiece",
    "Budget ¥2,000–3,000 per meal at market stalls"
  ],
  "days": [
    {
      "n": 1,
      "date": "Mon · Mar 10",
      "label": "Arrival & first evening",
      "theme": "Arrival · Nihonbashi",
      "area": "Nihonbashi / Ginza",
      "photoQuery": "Tokyo street night",
      "events": [
        {
          "kind": "flight",
          "time": "14:00",
          "title": "UA 837 LHR → NRT",
          "meta": "Terminal 3 · Confirmation XK29",
          "suggested": false,
          "location": "Narita International Airport, Tokyo",
          "tips": []
        },
        {
          "kind": "hotel",
          "time": "17:00",
          "title": "Hotel K5",
          "meta": "Nihonbashi · check-in",
          "suggested": true,
          "rating": 4.7,
          "location": "Nihonbashi, Tokyo",
          "reason": "One of the most design-forward boutique hotels in central Tokyo.",
          "tips": ["Ask for a room on the upper floors for city views"]
        }
      ]
    }
  ]
}

CRITICAL RULES — read carefully:

SUGGESTED vs CONFIRMED:
- "suggested": false  → ONLY for things the user explicitly mentioned: a specific flight number, hotel name they booked, restaurant reservation they made, confirmed activity they named. If the user said it, it's confirmed.
- "suggested": true   → EVERYTHING else you are recommending — hotels, restaurants, sights, transport, any idea of your own. When in doubt, mark suggested.
- NEVER invent confirmed bookings. If the user only mentioned dates and a city, every event except their stated details must be suggested: true.

FLIGHTS & HOTELS — SKIP IF ALREADY BOOKED:
- If the user says their flights are booked, sorted, or handled (any phrasing), do NOT generate any suggested flight events at all. Only include flight events if the user provided a specific flight number or departure details.
- If the user says their hotel, accommodation, or place to stay is booked, sorted, or handled, do NOT generate any suggested hotel events. Only include hotel events if the user named the specific hotel.
- When in doubt about whether something is booked, ask less rather than suggest more — focus the itinerary on activities, food, and experiences instead.

DATES:
- Use today's date (${today}) to calculate the correct day of week for every date in the itinerary.
- Date format: "Mon · Mar 10" — the three-letter day abbreviation must be mathematically correct.
- If the user didn't specify a year, use the next upcoming occurrence of those dates.

OTHER RULES:
- kind: flight, hotel, food, activity, transport, or flag
- 3–5 events per day, geographically clustered
- theme: short tag for the day character — "Explore Yanaka", "Day trip · Nikko", "Rest day"
- area: primary neighbourhood or region for the day
- photoQuery: 2–3 word Unsplash search term for the day's visual highlight — a dish, landmark, or mood
- tips: 1–3 insider notes per event. Empty array [] if nothing specific.
- rating: real-world rating 0–5 for hotels, restaurants, attractions. Omit for flights/transport.
- location: full address sufficient to resolve in Google Maps — include street, neighbourhood, and city. E.g. "6th Street Entertainment District, Austin, TX" not just "6th Street". Omit for flights.
- reason: suggested events only — one sentence why this was added. Omit for confirmed events.
- highlights: 3–5 folio-level bullet points — timing, must-dos, budget
- tldr: 2–3 sentences on overall rhythm and character
- Pure JSON only — no markdown fences
- CONSISTENCY: produce the same number of days every time for the same input. Do not randomly vary duration.
- TOOL MISUSE: if the input is a question rather than a trip description, still produce a best-guess folio — do not return an error message or a conversational reply.

FLIGHT ROUTING — follow these rules exactly for every flight event:
1. REAL ROUTES ONLY: Only include flight routes that are actually served by commercial airlines. Use your training knowledge to verify the route exists. If a direct route does not exist, do not invent one.
2. DIRECT FIRST: Always prefer a direct (nonstop) flight. If a direct flight exists, use routeType "direct".
3. CONNECTING FLIGHTS: If no direct route exists, route through the most logical real hub (e.g. LHR, CDG, FRA, DXB, DOH, SIN, NRT, JFK, LAX). Use routeType "connecting". Never invent connection cities.
4. SURFACE TRANSPORT: If the origin and destination are within ~400km, or if no air service exists at all, use kind "transport" (not "flight") and describe the train, bus, or drive. Use routeType "surface".
5. routeNote field (required for every flight event): e.g. "Direct · ~11h", "Via Dubai · ~16h total", "No direct — via Frankfurt", or "Drive · ~3h".
6. NEVER invent flight numbers for suggested flights. User-provided flight numbers (suggested:false) are kept as-is.
7. IATA codes: Only use real IATA airport codes. Never invent codes.
8. REALISTIC TIMES: Minimum 1h30 for domestic connections, 2h for international. Never show shorter.
9. UNCERTAINTY: If uncertain a route is served, add a tip: "Verify this route before booking — service may be seasonal."
- routeNote: short routing summary — required for kind "flight"
- routeType: "direct" | "connecting" | "surface" — required for kind "flight"`;
}

// ── SSRF protection ───────────────────────────────────────────────────────────

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|::1$|fc00:|fe80:)/i;

async function fetchUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed');
  }

  if (PRIVATE_HOST_RE.test(parsed.hostname)) {
    throw new Error('Private or internal URLs are not allowed');
  }

  const res = await fetch(parsed.href, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Wanderluster/1.0)' },
    signal: AbortSignal.timeout(8000),
  });

  // Reject non-text responses before reading the body
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/')) {
    throw new Error('URL does not return a text document');
  }

  // Read with a hard byte cap to avoid large downloads
  const MAX_BYTES = 500_000;
  const reader = res.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let text = '';
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    text += decoder.decode(value, { stream: true });
    if (totalBytes > MAX_BYTES) {
      reader.cancel();
      break;
    }
  }

  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

export async function POST(request: Request) {
  try {
    // Auth required
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    // Rate limit per user
    if (!checkRateLimit(`compose:${auth.userId}`, RATE_LIMIT.max, RATE_LIMIT.windowMs)) {
      return rateLimitedResponse();
    }

    const { mode, input, imageData } = await request.json() as {
      mode: 'words' | 'link' | 'screenshots';
      input: string;
      imageData?: string;
    };

    if (!input?.trim() && !imageData) {
      return Response.json({ error: 'No input provided' }, { status: 400 });
    }

    // Guard: imageData must be a data URI and under size cap
    if (imageData) {
      if (!imageData.startsWith('data:image/')) {
        return Response.json({ error: 'Invalid image format' }, { status: 400 });
      }
      if (imageData.length > MAX_IMAGE_DATA_LEN) {
        return Response.json({ error: 'Image too large (max ~3.7 MB)' }, { status: 413 });
      }
    }

    const SYSTEM = buildSystem();

    // Image mode: vision model, no streaming support — return JSON directly
    if (imageData) {
      const result = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            {
              type: 'text',
              text: `${SYSTEM}\n\nThis is a screenshot of a trip itinerary or booking. Extract visible details as confirmed events (suggested: false). Add suggested events (suggested: true) with tips and ratings to fill the trip.${input?.trim() ? `\n\nUser note: ${input.trim()}` : ''}`,
            },
          ] as any,
        }],
      });
      const raw = result.choices[0]?.message?.content ?? '{}';
      const folio = extractAndParseFolio(raw);
      return Response.json({ folio });
    }

    // Text / link mode: stream so the connection stays alive
    let content = input.trim();
    if (mode === 'link') {
      try {
        content = await fetchUrl(input.trim());
      } catch (err: any) {
        return Response.json(
          { error: err?.message ?? 'Could not fetch that URL. Try describing the trip in words instead.' },
          { status: 422 }
        );
      }
    }

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 8000,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error('[compose api]', detail);
    return Response.json({ error: detail }, { status: 500 });
  }
}
