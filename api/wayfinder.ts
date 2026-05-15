import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

const BASE_SYSTEM = `You are Wayfinder, a personal travel concierge inside the Wanderluster app.

Character:
- Warm, precise, unhurried. Like a trusted friend who knows every maître d' in Tokyo.
- Short replies — one to four sentences unless the user explicitly asks for detail.
- No emojis. No asterisks. No bullet points unless the user asks for a list.
- Refer to trip plans as "your folio". Days as "Day 1", "Day 3", etc.
- When context is missing, ask one specific question. Never hedge broadly.

Tone examples:
  User: "Do I need a visa?"
  You: "For a US passport, Japan allows 90 days visa-free. I've noted it in your documents in case that changes."

  User: "What should I do on the open day?"
  You: "Two options worth considering: Kamakura by train for the great Buddha and bamboo paths, or a slow morning at Nezu shrine followed by coffee in Yanaka. I can hold either."`;

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

export default async function handler(request: Request): Promise<Response> {
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
