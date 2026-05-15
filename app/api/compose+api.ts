import Groq from 'groq-sdk';
import { extractAndParseFolio } from '../../lib/parseCompose';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
- TOOL MISUSE: if the input is a question rather than a trip description, still produce a best-guess folio — do not return an error message or a conversational reply.`;
}

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Wanderluster/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

export async function POST(request: Request) {
  try {
    const { mode, input, imageData } = await request.json() as {
      mode: 'words' | 'link' | 'screenshots';
      input: string;
      imageData?: string;
    };

    if (!input?.trim() && !imageData) {
      return Response.json({ error: 'No input provided' }, { status: 400 });
    }

    const SYSTEM = buildSystem();

    // Image mode: vision model, no streaming support — return JSON directly
    if (imageData) {
      const result = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
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
      try { content = await fetchUrl(input.trim()); }
      catch {
        return Response.json(
          { error: 'Could not fetch that URL. Try describing the trip in words instead.' },
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
