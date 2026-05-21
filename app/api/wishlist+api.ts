import Groq from 'groq-sdk';
import { requireAuth, checkRateLimit, rateLimitedResponse } from '../../lib/api-auth';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 20 wishlist additions per user per 5 minutes
const RATE_LIMIT = { max: 20, windowMs: 5 * 60 * 1000 };

const SYSTEM = `You are a travel expert. Given a destination name, return a JSON object with these exact fields. No markdown, no explanation. Return ONLY valid JSON.

{
  "name": "Clean destination name, e.g. Bali, Indonesia",
  "season": "Best time to visit short form, e.g. Apr – Oct",
  "vibe": "2–3 dot-separated vibes, e.g. Beach · Culture · Wellness",
  "visa": "Short visa note, e.g. Visa on arrival or No visa required",
  "budget": "One of $, $$, $$$, $$$$",
  "palette": {
    "a": "#hexcolor — light tone that evokes the destination",
    "b": "#hexcolor — mid tone",
    "c": "#hexcolor — dark tone"
  },
  "bestTime": {
    "months": "e.g. Mar – May, Sep – Nov",
    "why": "One sentence explaining why this is the best time",
    "temp": "e.g. 20–30°C"
  }
}`;

export async function POST(request: Request) {
  try {
    // Auth required
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    // Rate limit per user
    if (!checkRateLimit(`wishlist:${auth.userId}`, RATE_LIMIT.max, RATE_LIMIT.windowMs)) {
      return rateLimitedResponse();
    }

    const { destination } = await request.json() as { destination: string };

    if (!destination?.trim()) {
      return Response.json({ error: 'destination is required' }, { status: 400 });
    }

    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      stream: false,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: destination.trim() },
      ],
    });

    const raw = result.choices[0]?.message?.content ?? '{}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Strip markdown fences if the model wrapped the response
      const stripped = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(stripped);
    }

    return Response.json(parsed);
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error('[wishlist api]', detail);
    return Response.json({ error: detail }, { status: 500 });
  }
}
