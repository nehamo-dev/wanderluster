export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GMAIL_QUERY = [
  'from:(booking.com OR hotels.com OR airbnb.com OR expedia.com',
  'OR united.com OR delta.com OR aa.com OR british-airways.com)',
  'subject:(confirmation OR booking OR reservation OR itinerary)',
].join(' ');

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailThread {
  id: string;
  messages?: Array<{
    id: string;
    payload?: {
      headers?: Array<{ name: string; value: string }>;
    };
    snippet?: string;
  }>;
}

interface BookingSummary {
  subject: string;
  sender: string;
  snippet: string;
  threadId: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { accessToken } = await req.json() as { accessToken: string };
    if (!accessToken) {
      return Response.json({ error: 'accessToken required' }, { status: 400, headers: CORS });
    }

    // Search for matching messages
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('[gmail] search error:', err);
      return Response.json({ error: 'gmail_api_error', bookings: [] }, { status: 200, headers: CORS });
    }

    const searchData = await searchRes.json() as { messages?: GmailMessage[] };
    const messages = searchData.messages ?? [];

    // Deduplicate by thread
    const seenThreads = new Set<string>();
    const uniqueMessages = messages.filter(m => {
      if (seenThreads.has(m.threadId)) return false;
      seenThreads.add(m.threadId);
      return true;
    });

    // Fetch first message from each unique thread
    const bookings: BookingSummary[] = await Promise.all(
      uniqueMessages.slice(0, 10).map(async (msg) => {
        try {
          const threadRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${msg.threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (!threadRes.ok) return null;
          const thread = await threadRes.json() as GmailThread;
          const firstMsg = thread.messages?.[0];
          if (!firstMsg) return null;
          const headers = firstMsg.payload?.headers ?? [];
          const subject = headers.find(h => h.name === 'Subject')?.value ?? '';
          const sender = headers.find(h => h.name === 'From')?.value ?? '';
          return {
            subject,
            sender,
            snippet: firstMsg.snippet ?? '',
            threadId: msg.threadId,
          } satisfies BookingSummary;
        } catch {
          return null;
        }
      }),
    ).then(results => results.filter((b): b is BookingSummary => b !== null));

    return Response.json({ bookings }, { headers: CORS });
  } catch (err: any) {
    console.error('[gmail]', err?.message ?? err);
    return Response.json({ error: 'internal error', bookings: [] }, { status: 500, headers: CORS });
  }
}
