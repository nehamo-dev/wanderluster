import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `You are a travel planning AI that creates detailed, opinionated trip itineraries.

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
          "tips": ["Ask for a room on the upper floors for city views", "The in-house bar Ao is worth a drink before dinner"]
        },
        {
          "kind": "food",
          "time": "20:00",
          "title": "Tonki",
          "meta": "Meguro · tonkatsu counter",
          "suggested": true,
          "rating": 4.5,
          "location": "Meguro, Tokyo",
          "tips": ["Order the hire katsu (loin)", "Queue outside — worth the 20-minute wait", "Cash only"]
        }
      ]
    }
  ]
}

Rules:
- kind: flight, hotel, food, activity, transport, or flag
- 3–5 events per day, geographically clustered
- theme: short tag for the day character — "Explore Yanaka", "Day trip · Nikko", "Rest day", "Markets & music"
- area: primary neighbourhood or region for the day
- photoQuery: 2–3 word Unsplash search term that best captures the day's highlight — a dish, landmark, or atmosphere. E.g. "Tokyo ramen bowl", "Kyoto bamboo forest", "Santorini sunset"
- tips: 1–3 insider notes per event — what to order, when to arrive, what to skip, hidden details. Empty array if nothing specific.
- rating: real-world rating out of 5 for hotels, restaurants, attractions. Omit for flights/transport.
- location: neighbourhood, district or address for map linking. Omit for flights.
- reason: for suggested events only — one short sentence explaining why this was added (e.g. "Highly rated neighbourhood gem a short walk from your hotel"). Omit for confirmed/known events.
- highlights: 3–5 bullet points at folio level — timing notes, must-dos, budget hints
- tldr: 2–3 sentences capturing the overall rhythm and character
- Pure JSON only — no markdown fences`;

function extractJSON(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in response');
  return JSON.parse(stripped.slice(start, end + 1));
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

    let raw: string;

    if (imageData) {
      const result = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            {
              type: 'text',
              text: `${SYSTEM}\n\nThis is a screenshot of a trip itinerary or booking. Extract visible details as known events, add suggested events with tips and ratings to fill the trip.${input?.trim() ? `\n\nUser note: ${input.trim()}` : ''}`,
            },
          ] as any,
        }],
      });
      raw = result.choices[0]?.message?.content ?? '{}';
    } else {
      let content = input.trim();
      if (mode === 'link') {
        try {
          content = await fetchUrl(input.trim());
        } catch {
          return Response.json(
            { error: 'Could not fetch that URL. Try describing the trip in words instead.' },
            { status: 422 }
          );
        }
      }

      const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: content },
        ],
      });
      raw = result.choices[0]?.message?.content ?? '{}';
    }

    const folio = extractJSON(raw);
    return Response.json({ folio });
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error('[compose api]', detail);
    return Response.json({ error: detail }, { status: 500 });
  }
}
