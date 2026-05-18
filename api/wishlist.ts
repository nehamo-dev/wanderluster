import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

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
    const { destination } = await request.json() as { destination: string };

    if (!destination?.trim()) {
      return Response.json({ error: 'destination is required' }, { status: 400, headers: CORS });
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

    return Response.json(parsed, { headers: CORS });
  } catch (err: any) {
    console.error('[wishlist]', err?.message ?? err);
    return Response.json({ error: err?.message ?? String(err) }, { status: 500, headers: CORS });
  }
}
