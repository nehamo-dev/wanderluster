// Collects feedback on confirmed events the user marks as incorrect.
// Logged now; can be piped to Supabase or a fine-tuning dataset later.
import { requireAuth } from '../../lib/api-auth';

export async function POST(request: Request) {
  try {
    // Auth required — prevents anonymous abuse and ties feedback to a user
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json() as {
      folioId: string;
      destination: string;
      event: { kind: string; title: string; time: string | null };
      reason: 'incorrect_data' | 'change_of_plan';
    };

    // Log only non-PII fields — omit folioId (internal UUID) and full event title
    console.log('[feedback]', {
      destination: body.destination,
      kind: body.event?.kind,
      reason: body.reason,
    });

    // TODO: persist to Supabase `event_feedback` table for training
    // await supabase.from('event_feedback').insert({
    //   user_id: auth.userId,
    //   destination: body.destination,
    //   event_kind: body.event?.kind,
    //   reason: body.reason,
    //   created_at: new Date(),
    // });

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
