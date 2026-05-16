export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:8082';

  if (error || !code) {
    return Response.redirect(`${base}/(app)/settings?error=${encodeURIComponent(error ?? 'no_code')}`, 302);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: `${base}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[google/callback] token exchange failed:', err);
      return Response.redirect(`${base}/(app)/settings?error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const token = encodeURIComponent(tokenData.access_token);
    return Response.redirect(`${base}/(app)/settings?token=${token}`, 302);
  } catch (err: any) {
    console.error('[google/callback]', err?.message ?? err);
    return Response.redirect(`${base}/(app)/settings?error=internal`, 302);
  }
}
