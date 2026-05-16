export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TRAVEL_KEYWORDS = [
  'hotel', 'flight', 'airport', 'reservation', 'check-in', 'check in',
  'boarding', 'departs', 'arrives', 'transit', 'airline', 'hostel',
  'airbnb', 'resort', 'itinerary', 'travel',
];

interface CalendarEvent {
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function isTravelEvent(ev: CalendarEvent): boolean {
  const text = [ev.summary ?? '', ev.description ?? '', ev.location ?? '']
    .join(' ')
    .toLowerCase();
  return TRAVEL_KEYWORDS.some(k => text.includes(k));
}

function parseDate(ev: CalendarEvent): Date | null {
  const raw = ev.start?.dateTime ?? ev.start?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function groupIntoClusters(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];
  // Sort by start date
  const sorted = [...events].sort((a, b) => {
    const da = parseDate(a)?.getTime() ?? 0;
    const db = parseDate(b)?.getTime() ?? 0;
    return da - db;
  });

  const clusters: CalendarEvent[][] = [];
  let current: CalendarEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseDate(sorted[i - 1]);
    const curr = parseDate(sorted[i]);
    const gap = prev && curr ? curr.getTime() - prev.getTime() : Infinity;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (gap <= sevenDays) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);
  return clusters;
}

function clusterToSummary(cluster: CalendarEvent[]) {
  const titles = cluster.map(ev => ev.summary ?? '').filter(Boolean);
  const locations = [...new Set(cluster.map(ev => ev.location ?? '').filter(Boolean))];
  const startDate = parseDate(cluster[0]);
  const endDate = parseDate(cluster[cluster.length - 1]);

  return {
    title: titles[0] ?? 'Trip',
    destination: locations[0] ?? 'Unknown',
    country: '',
    dates: startDate && endDate
      ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '',
    duration: startDate && endDate
      ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1} days`
      : '',
    season: '',
    vibe: 'adventure',
    palette: { a: '#d4c4b0', b: '#8a7a6a', c: '#2a2218', accent: '#a8824c' },
    visa: null,
    teaser: titles.slice(0, 3).join(', '),
    days: [],
    docs: [],
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { accessToken } = await req.json() as { accessToken: string };
    if (!accessToken) {
      return Response.json({ error: 'accessToken required' }, { status: 400, headers: CORS });
    }

    const now = new Date();
    const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: '100',
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!calRes.ok) {
      const err = await calRes.text();
      console.error('[calendar] API error:', err);
      return Response.json({ error: 'calendar_api_error', trips: [] }, { status: 200, headers: CORS });
    }

    const data = await calRes.json() as { items?: CalendarEvent[] };
    const travelEvents = (data.items ?? []).filter(isTravelEvent);
    const clusters = groupIntoClusters(travelEvents);
    const trips = clusters.map(clusterToSummary);

    return Response.json({ trips }, { headers: CORS });
  } catch (err: any) {
    console.error('[calendar]', err?.message ?? err);
    return Response.json({ error: 'internal error', trips: [] }, { status: 500, headers: CORS });
  }
}
