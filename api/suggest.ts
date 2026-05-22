import Groq from 'groq-sdk';
import { requireAuth, checkRateLimit, rateLimitedResponse } from '../lib/api-auth';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!checkRateLimit(`suggest:${auth.userId}`, 60, 5 * 60 * 1000)) return rateLimitedResponse();

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const { destination, country, dayLabel, dayDate, dayArea, removedEvent, existingEvents } = await request.json() as {
      destination: string;
      country: string;
      dayLabel: string;
      dayDate: string;
      dayArea?: string;
      removedEvent: { kind: string; title: string; time: string | null; location?: string; meta?: string };
      existingEvents: Array<{ kind: string; title: string; time: string | null; location?: string; meta?: string }>;
    };

    const existing = existingEvents.map(e => {
      const area = e.location || e.meta;
      return `${e.time ?? '?'} — ${e.title}${area ? ` (${area})` : ''}`;
    }).join('\n');

    const removedArea = removedEvent.location || removedEvent.meta;
    const areaContext = dayArea
      ? `This day is focused on: ${dayArea}`
      : removedArea
        ? `The removed event was in: ${removedArea}`
        : '';

    const prompt = `You are a travel expert suggesting a single alternative activity.

Destination: ${destination}, ${country}
Day: ${dayLabel} (${dayDate})
${areaContext ? areaContext + '\n' : ''}The traveller removed: "${removedEvent.title}" (${removedEvent.kind})${removedArea ? ` in ${removedArea}` : ''}

Already on this day:
${existing || 'Nothing else planned'}

Suggest ONE specific alternative of the same kind (${removedEvent.kind}).
${areaContext ? 'IMPORTANT: Suggest something in the same neighbourhood or area as the other events on this day — do not send the traveller to the opposite end of the city.' : ''}
Return ONLY valid JSON — no markdown, no explanation:
{ "kind": "${removedEvent.kind}", "time": "HH:MM or null", "title": "Specific place name", "meta": "Neighbourhood · one-phrase reason it's worth visiting", "suggested": true }

Rules:
- Be specific: name a real place, not a generic description
- Stay in the same neighbourhood as the other day's events when possible
- Don't repeat anything already on the day
- For food: name a real restaurant + its standout dish or style
- For activity: name the venue + one phrase on why it's worth visiting
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
