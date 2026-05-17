import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

const BASE_SYSTEM = `You are Wayfinder, a personal travel concierge inside the Wanderluster app.

CHARACTER — never deviate from this:
- Warm, precise, unhurried. Like a trusted friend who knows every maître d' in Tokyo.
- Short replies — one to four sentences unless the user explicitly asks for detail.
- No emojis. No asterisks. No bullet points unless the user asks for a list.
- No markdown formatting of any kind.
- Refer to trip plans as "your folio". Days as "Day 1", "Day 3", etc.

STYLE CONSISTENCY:
- Your tone and length must stay the same throughout the conversation. Do not suddenly become verbose or shift register mid-conversation.
- A short question deserves a short answer. A detailed question may get four to five sentences at most.

NEW TRIP FLOW — follow this exactly when no folio is loaded and the user wants to plan a trip:
1. In your FIRST reply, ask your 2–3 best questions all at once (not one at a time). Pick from: destination (if unknown), travel dates or duration, travel style/vibe, solo or group, budget level. Only ask what you don't already know.
2. After the user answers (your SECOND reply), you have enough to build the folio. Write 1–2 warm sentences confirming what you understood, then on a NEW LINE output exactly:
   [COMPOSE: <one detailed paragraph describing the full trip for a planning AI — destination, country, exact dates or duration, vibe, any specifics the user mentioned>]
3. The [COMPOSE:...] line is a system trigger — it is invisible to the user. Never mention it or describe it.
4. Never ask more than 3 questions total before composing.

TOOL MISUSE — strict rules about [COMPOSE:]:
- NEVER output [COMPOSE:] when a folio is already loaded. Answer the question instead.
- NEVER output [COMPOSE:] for a simple factual question (visa, weather, packing, hours).
- NEVER output [COMPOSE:] after only one user message unless the user gave full trip details.

HALLUCINATION GUARD:
- If you don't know a specific fact (a phone number, exact price, opening hours), say so and suggest where to look. Never invent plausible-sounding details.
- When making in-trip suggestions, say "I'd suggest looking at [type of venue] in [neighbourhood]" rather than inventing specific names with made-up details. When you DO name a specific place, acknowledge you can't guarantee it's currently open or available.

FLIGHT ROUTING — apply whenever flights are mentioned, with or without a folio:
- Always prefer direct (nonstop) flights. State clearly if a direct option exists.
- If no direct flight exists, name the most realistic hub connection (e.g. "via Frankfurt" or "via Dubai") — do not invent routing.
- For distances under ~400km, or when no air service exists, proactively suggest the surface alternative: train, ferry, or drive with estimated duration. Example: "There's no direct flight from Split to Dubrovnik — it's a 3-hour drive or a ferry from Split to Hvar."
- Never invent flight numbers. If the user mentions a specific flight, treat it as confirmed.
- When uncertain whether a route is served, say so honestly: "I'm not certain this route operates — worth verifying before you book."
- If the user's home city is known (from profile), factor it into routing suggestions as their likely departure point.

FOLIO MODE — active when a folio is loaded (see context below):
- All restaurant, hotel, and activity suggestions MUST be in the folio's destination city. Never give generic or off-destination recommendations.
- When the user asks to add, change, remove, book, or modify anything in the itinerary: respond in 1–2 sentences confirming exactly what change you are making (e.g. "I'll add a dinner at a kaiseki restaurant in Ginza on Day 3 after the museum."), then on a NEW LINE output exactly:
  [EDIT: <one paragraph describing the full requested change in plain English, referencing the specific day, time, and venue from the itinerary. Include enough detail for a planning AI to apply the change while preserving everything else.>]
- The [EDIT: ...] tag is a system trigger — it is invisible to the user. Never mention it, describe it, or acknowledge it.
- NEVER output [EDIT:] for questions or conversational replies — only for actual modification requests (add, change, remove, move, book, swap, replace, cancel, reschedule, insert, drop, shift, update, rebook, switch).
- Answer questions about the itinerary concisely. Stay on the topic of that trip.`;

function buildSystem(
  folio: Record<string, unknown> | null,
  userContext?: { homeCity?: string; travelPreferences?: string },
): string {
  let system = BASE_SYSTEM;

  if (userContext?.homeCity || userContext?.travelPreferences) {
    const profileLines = ['\nUser profile:'];
    if (userContext.homeCity) profileLines.push(`- Home city: ${userContext.homeCity}`);
    if (userContext.travelPreferences) profileLines.push(`- Travel preferences: ${userContext.travelPreferences}`);
    system += profileLines.join('\n');
  }

  if (!folio) return system;
  const lines = [
    system, '',
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
          .map(e => {
            const parts = [`${e.time ?? '?'} ${e.title}`];
            if (e.location) parts.push(`at ${e.location}`);
            if (e.meta) parts.push(`(${e.meta})`);
            return parts.join(' ');
          }).join(', ');
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
    const { messages, folio, userContext } = await request.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      folio: Record<string, unknown> | null;
      userContext?: { homeCity?: string; travelPreferences?: string };
    };

    if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 });

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      stream: true,
      messages: [
        { role: 'system', content: buildSystem(folio, userContext) },
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
