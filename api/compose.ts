import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function correctDates(folio: any): any {
  if (!Array.isArray(folio.days)) return folio;
  const now = new Date();
  folio.days = folio.days.map((day: any) => {
    if (!day.date) return day;
    const m = day.date.match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
    if (!m) return day;
    const month = MONTHS[m[1]];
    if (month === undefined) return day;
    const dayNum = parseInt(m[2], 10);
    const year = new Date(now.getFullYear(), month, dayNum) < now
      ? now.getFullYear() + 1 : now.getFullYear();
    const d = new Date(year, month, dayNum);
    return { ...day, date: `${DAYS[d.getDay()]} · ${m[1]} ${m[2]}` };
  });
  return folio;
}

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

function sanitizeJSON(s: string): string {
  // Fix the two most common LLM JSON bugs:
  // 1. Unescaped control characters (newline, tab, CR) inside string values
  // 2. Trailing commas before ] or }
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  // Remove trailing commas before ] or }
  return out.replace(/,(\s*[\]}])/g, '$1');
}

function extractJSON(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in response');
  const candidate = stripped.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {}
  try { return JSON.parse(sanitizeJSON(candidate)); } catch (e: any) {
    throw new Error(`Malformed JSON from model: ${e.message}`);
  }
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

export default async function handler(request: Request): Promise<Response> {
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
    let raw: string;

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
      raw = result.choices[0]?.message?.content ?? '{}';
    } else {
      let content = input.trim();
      if (mode === 'link') {
        try { content = await fetchUrl(input.trim()); }
        catch { return Response.json({ error: 'Could not fetch that URL. Try describing the trip in words instead.' }, { status: 422 }); }
      }
      const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content },
        ],
      });
      raw = result.choices[0]?.message?.content ?? '{}';
    }

    const folio = correctDates(extractJSON(raw));
    return Response.json({ folio });
  } catch (err: any) {
    console.error('[compose]', err?.message ?? err);
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
