import { requireAuth } from '../lib/api-auth';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    // Log only non-PII fields
    console.log('[feedback]', { destination: body?.destination, kind: body?.event?.kind, reason: body?.reason });
    // TODO: persist to Supabase event_feedback table for training
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
