/**
 * GET /api/place-photo?q=Hotel+K5+Nihonbashi+Tokyo
 *
 * Looks up a venue on Google Places and returns a publicly-accessible
 * photo URL. The API key never leaves the server.
 *
 * Requires GOOGLE_MAPS_API_KEY in environment variables (Places API + Photos API enabled).
 * Returns { url: string | null } — null when no photo is found or the key is missing.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) return Response.json({ url: null });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Response.json({ url: null });

  try {
    // 1. Find the place and get a photo reference
    const findUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(q)}` +
      `&inputtype=textquery` +
      `&fields=photos` +
      `&key=${apiKey}`;

    const findRes = await fetch(findUrl, { signal: AbortSignal.timeout(6000) });
    const findData = await findRes.json() as {
      status: string;
      candidates?: { photos?: { photo_reference: string }[] }[];
    };

    const photoRef = findData.candidates?.[0]?.photos?.[0]?.photo_reference;
    if (!photoRef) return Response.json({ url: null });

    // 2. Resolve the photo reference to a real URL by following the redirect.
    //    Google returns a 302 → lh3.googleusercontent.com, which is public.
    const photoEndpoint =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=200&photo_reference=${photoRef}&key=${apiKey}`;

    const photoRes = await fetch(photoEndpoint, {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });

    // After following redirects, photoRes.url is the public CDN URL
    const url = photoRes.url ?? null;
    return Response.json({ url });
  } catch (err: any) {
    console.error('[place-photo]', err?.message ?? err);
    return Response.json({ url: null });
  }
}
