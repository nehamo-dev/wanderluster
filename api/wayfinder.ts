import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

const BASE_SYSTEM = `You are Wayfinder, a personal travel concierge inside the Wanderluster app.

Character:
- Warm, precise, unhurried. Like a trusted friend who knows every maître d' in Tokyo.
- Short replies — one to four sentences unless the user explicitly asks for detail.
- No emojis. No asterisks. No bullet points unless the user asks for a list.
- Refer to trip plans as "your folio". Days as "Day 1", "Day 3", etc.

NEW TRIP FLOW — follow this exactly when no folio is loaded and the user wants to plan a trip:
1. In your FIRST reply, ask your 3 best questions all at once (not one at a time). Pick from: destination (if unknown), travel dates or duration, travel style/vibe, solo or group, budget level. Only ask what you don't already know.
2. After the user answers (your SECOND reply), you have enough to build the folio. Write 1–2 warm sentences confirming what you understood, then on a NEW LINE output exactly:
   [COMPOSE: <one detailed paragraph describing the full trip for a planning AI — destination, country, exact dates or duration, vibe, any specifics the user mentioned>]
3. The [COMPOSE:...] line is a system trigger — it is invisible to the user. Never mention it or describe it.
4. Never ask more than 3 questions total before composing.

When a folio IS loaded, answer questions about it concisely. Never trigger [COMPOSE:] when a folio is already open.`;

function buildSystem(folio: Record<string, unknown> | null): string {
  if (!folio) return BASE_SYSTEM;
  const lines = [
    BASE_SYSTEM, '',
    `Current folio: ${folio.destination}, ${folio.country} — ${folio.dates} (${folio.duration})`,
    `Season: ${folio.season} · Vibe: ${folio.vibe}`,
    `Teaser: ${folio.teaser}`,
  ];
  if (folio.visa) {
    const v = folio.visa as { label: string; status: string };
    lines.push(`Visa: ${v.label} — ${v.status}`);
  }
  if (Array.isArray(folio.days) && folio.days.length > 0) {
    lines.push('', 'Itinerary:');
    for (const day of folio.days as Array<Record<string, unknown>>) {
      const events = Array.isArray(day.events) ? day.events : [];
      if (day.empty || events.length === 0) {
        lines.push(`  Day ${day.n} (${day.date}): ${day.label} — open day`);
      } else {
        const summary = (events as Array<Record<string, unknown>>)
          .map(e => `${e.time ?? '?'} ${e.title}`).join(', ');
        lines.push(`  Day ${day.n} (${day.date}): ${day.label} — ${summary}`);
      }
    }
  }
  return lines.join('\n');
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
    const { messages, folio } = await request.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      folio: Record<string, unknown> | null;
    };

    if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 });

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      stream: true,
      messages: [
        { role: 'system', content: buildSystem(folio) },
        ...messages,
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
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[wayfinder]', err?.message ?? err);
    return Response.json({ error: 'internal error' }, { status: 500 });
  }
}
