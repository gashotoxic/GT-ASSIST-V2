/**
 * Shared request guards for the serverless proxy routes (api/).
 * NOT for client import — lives outside api/ so Vercel bundles it into each
 * function, and client code must never reference it.
 */

// Browser origins allowed to spend the platform keys. Non-browser clients send
// no Origin (they are caught by rate limiting instead — this is deliberate
// defence-in-depth, not authentication; Clerk session verification is the
// follow-up for real auth).
const ALLOWED_ORIGINS = new Set([
  'https://create.gashotech.com',
  'https://gashotech.com',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const jsonResponse = (data: unknown, status: number, extra?: Record<string, string>): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extra || {}) },
  });

/** 403 when a browser Origin is present and not ours; null when allowed. */
export const guardOrigin = (request: Request): Response | null => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return null;
  try {
    if (new URL(origin).hostname.endsWith('.vercel.app')) return null; // our previews
  } catch {
    // fall through to reject
  }
  return jsonResponse({ error: 'Origin not allowed' }, 403);
};

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

/**
 * Sliding-window rate limit per (bucket, client ip). State is per function
 * instance — coarse defence-in-depth against bulk spend, not a security
 * boundary (X-Forwarded-For can be spoofed by non-browser clients).
 */
export const guardRateLimit = (request: Request, bucket: string, maxPerMinute = 60): Response | null => {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0].trim() : '') || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  if (buckets.size > 2000) {
    for (const [k, hits] of buckets) {
      if (hits.length === 0 || now - hits[hits.length - 1] > 2 * WINDOW_MS) buckets.delete(k);
    }
  }

  const hits = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= maxPerMinute) {
    buckets.set(key, hits);
    return jsonResponse({ error: 'Rate limit exceeded, retry shortly' }, 429, { 'Retry-After': '60' });
  }
  hits.push(now);
  buckets.set(key, hits);
  return null;
};
