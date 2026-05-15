import Groq from 'groq-sdk';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const { destination, country, dayLabel, dayDate, removedEvent, existingEvents } = await request.json() as {
      destination: string;
      country: string;
      dayLabel: string;
      dayDate: string;
      removedEvent: { kind: string; title: string; time: string | null };
      existingEvents: Array<{ kind: string; title: string; time: string | null }>;
    };

    const existing = existingEvents.map(e => `${e.time ?? '?'} — ${e.title}`).join('\n');

    const prompt = `You are a travel expert suggesting a single alternative activity.

Destination: ${destination}, ${country}
Day: ${dayLabel} (${dayDate})
The traveller removed: "${removedEvent.title}" (${removedEvent.kind})

Already on this day:
${existing || 'Nothing else planned'}

Suggest ONE specific alternative of the same kind (${removedEvent.kind}).
Return ONLY valid JSON — no markdown, no explanation:
{ "kind": "${removedEvent.kind}", "time": "HH:MM or null", "title": "Specific place name", "meta": "Neighbourhood or one short note", "suggested": true }

Rules:
- Be specific: name a real place, not a generic description
- Don't repeat anything already on the day
- For food: include the restaurant name + one signature dish
- For activity: include the venue name + what makes it worth visiting
- Return pure JSON only`;

    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = result.choices[0]?.message?.content ?? '{}';
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    const event = JSON.parse(stripped.slice(start, end + 1));

    return Response.json({ event });
  } catch (err: any) {
    console.error('[suggest]', err?.message ?? err);
    return Response.json({ error: err?.message ?? 'Failed to suggest alternative' }, { status: 500 });
  }
}
