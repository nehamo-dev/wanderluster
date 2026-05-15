import Groq from 'groq-sdk';
import { correctDates, sanitizeJSON, extractAndParseFolio } from '../lib/parseCompose';

export const config = { runtime: 'edge' };

function buildSystem(): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return `You are a travel planning AI that creates detailed, opinionated trip itineraries.
Today's date is ${today}. Use this to calculate correct days of the week for all dates.

Given a trip description, create a complete day-by-day itinerary. Cluster each day geographically.

Return ONLY valid JSON. No markdown, no explanation. Exact shape:
{
  "destination": "City name",
  "title": "Short evocative trip title, 2–4 words",
  "country": "Country name",
  "dates": "Mon Mar 10 – Mon Mar 17",
  "duration": "7 days",
  "season": "Early spring",
  "vibe": "Culture · Food · Slow mornings",
  "teaser": "One atmospheric sentence.",
  "tldr": "Two or three sentences on overall rhythm.",
  "highlights": ["Highlight 1", "Highlight 2"],
  "days": [{
    "n": 1,
    "date": "Mon · Mar 10",
    "label": "Arrival & first evening",
    "theme": "Arrival · Nihonbashi",
    "area": "Nihonbashi / Ginza",
    "photoQuery": "Tokyo street night",
    "events": [{
      "kind": "flight",
      "time": "14:00",
      "title": "UA 837 LHR → NRT",
      "meta": "Terminal 3 · Confirmation XK29",
      "suggested": false,
      "tips": []
    }, {
      "kind": "hotel",
      "time": "17:00",
      "title": "Hotel K5",
      "meta": "Nihonbashi · check-in",
      "suggested": true,
      "rating": 4.7,
      "location": "Hotel K5, 3-chome-5 Nihonbashikobunachō, Chuo City, Tokyo",
      "reason": "Design-forward boutique hotel in central Tokyo.",
      "tips": ["Ask for upper floors for city views"]
    }]
  }]
}

CRITICAL: suggested:false ONLY for things the user explicitly provided (flight number, hotel booking, named reservation). Everything else MUST be suggested:true.
DATES: Calculate the correct day of week using today's date. Format: "Mon · Mar 10".
- kind: flight, hotel, food, activity, transport, or flag
- 3–5 events per day, geographically clustered
- location: full address for Google Maps including city. Omit for flights.
- reason: for suggested events only — one sentence why. Omit for confirmed.
- tips: 1–3 insider notes. Empty array [] if none.
- rating: 0–5 for hotels/restaurants/attractions. Omit for flights/transport.
- highlights: 3–5 folio-level bullet points
- Pure JSON only — no markdown fences`;
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    // Image mode: vision model doesn't support streaming — return JSON directly
    if (imageData) {
      const result = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            { type: 'text', text: `${SYSTEM}\n\nExtract visible details as confirmed events. Add suggested events to fill the trip.${input?.trim() ? `\n\nUser note: ${input.trim()}` : ''}` },
          ] as any,
        }],
      });
      const raw = result.choices[0]?.message?.content ?? '{}';
      try {
        const folio = extractAndParseFolio(raw);
        return Response.json({ folio }, { headers: CORS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS });
      }
    }

    // Text / link mode: stream tokens so Vercel edge doesn't time out
    let content = input.trim();
    if (mode === 'link') {
      try { content = await fetchUrl(input.trim()); }
      catch { return Response.json({ error: 'Could not fetch that URL. Try describing the trip in words instead.' }, { status: 422, headers: CORS }); }
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
        ...CORS,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[compose]', err?.message ?? err);
    return Response.json({ error: err?.message ?? String(err) }, { status: 500, headers: CORS });
  }
}
