/**
 * Shared API route helpers — auth verification and rate limiting.
 *
 * Auth: extracts the Supabase JWT from the Authorization header and verifies
 * it with Supabase. Returns the user's ID (UUID string) or null.
 *
 * Rate limiting: simple in-memory sliding window per user ID.
 * ⚠️  In-memory state resets when a Vercel function instance spins down.
 *     For production-grade distributed rate limiting use Upstash Redis +
 *     @upstash/ratelimit. This implementation prevents casual abuse but
 *     won't stop a coordinated multi-IP attack.
 */
import { supabaseServer } from './supabase-server';

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer token in the Authorization header.
 * Returns the Supabase user ID if valid, null otherwise.
 */
export async function getAuthUser(request: Request): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns a 401 Response if the request is unauthenticated.
 * Usage:
 *   const authResult = await requireAuth(request);
 *   if (authResult.error) return authResult.error;
 *   const userId = authResult.userId;
 */
export async function requireAuth(
  request: Request
): Promise<{ userId: string; error: null } | { userId: null; error: Response }> {
  const userId = await getAuthUser(request);
  if (!userId) {
    return {
      userId: null,
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { userId, error: null };
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const _buckets = new Map<string, number[]>();

/**
 * Sliding-window rate limiter.
 * @param key      Unique key (e.g. userId + ':' + routeName)
 * @param max      Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (_buckets.get(key) ?? []).filter(t => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  _buckets.set(key, hits);
  return true;
}

/** Returns a 429 Response with a Retry-After header. */
export function rateLimitedResponse(): Response {
  return Response.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  );
}
