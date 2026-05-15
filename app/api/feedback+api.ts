// Collects feedback on confirmed events the user marks as incorrect.
// Logged now; can be piped to Supabase or a fine-tuning dataset later.

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      folioId: string;
      destination: string;
      event: { kind: string; title: string; time: string | null };
      reason: 'incorrect_data' | 'change_of_plan';
    };

    console.log('[feedback]', JSON.stringify(body));

    // TODO: persist to Supabase `event_feedback` table for training
    // await supabase.from('event_feedback').insert({ ...body, created_at: new Date() });

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
