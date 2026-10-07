/**
 * Server-side search proxy (Vercel serverless function).
 *
 * SECURITY CONTRACT: Tavily / Brave API keys NEVER reach the browser. Search
 * calls go through this route and the credential is injected here from
 * server-side environment variables (TAVILY_API_KEY / BRAVE_API_KEY, with a
 * transitional fallback to the legacy VITE_ variants).
 *
 * - POST { provider: 'tavily' | 'brave', query, maxResults?, searchDepth?, userKey? }
 *   -> runs the search upstream and returns its JSON verbatim.
 * - GET -> capability probe: { tavily: boolean, brave: boolean } (whether a
 *   platform key exists for each provider; never exposes key material).
 * - userKey is an optional BYOK key; when absent the platform key is used.
 * - Guards: browser-Origin allowlist (lib/apiGuard) + per-IP rate limiting.
 *
 * HANDLER SIGNATURE: Vercel requires named method exports (`export function
 * GET/POST(request: Request)`) — a plain default-exported function is never
 * invoked and the function 504s. Verified against
 * https://vercel.com/docs/functions/runtimes/node-js
 */

export const config = { maxDuration: 30, supportsResponseStreaming: true };

// ---- Request guards (INLINED on purpose: Vercel does not bundle relative
// cross-directory imports for /api functions — a shared module fails at
// runtime with ERR_MODULE_NOT_FOUND. Keep in sync with api/chutes.ts.) ----

const ALLOWED_ORIGINS = new Set([
  'https://create.gashotech.com',
  'https://gashotech.com',
  'http://localhost:3000',
  'http://localhost:5173',
]);

/** 403 when a browser Origin is present and not ours; null when allowed. */
const guardOrigin = (request: Request): Response | null => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return null;
  try {
    if (new URL(origin).hostname.endsWith('.vercel.app')) return null; // our previews
  } catch {
    // fall through to reject
  }
  return json({ error: 'Origin not allowed' }, 403);
};

const WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

/** Per-IP sliding window (per instance) — defence-in-depth, not auth. */
const guardRateLimit = (request: Request, bucket: string, maxPerMinute = 60): Response | null => {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0].trim() : '') || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  if (rateBuckets.size > 2000) {
    for (const [k, hits] of rateBuckets) {
      if (hits.length === 0 || now - hits[hits.length - 1] > 2 * WINDOW_MS) rateBuckets.delete(k);
    }
  }
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= maxPerMinute) {
    rateBuckets.set(key, hits);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded, retry shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return null;
};
// ---- End request guards ----

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const resolveKey = (provider: 'tavily' | 'brave', userKey: unknown): string | undefined => {
  if (typeof userKey === 'string' && userKey.trim().length > 0) return userKey.trim();
  // Transitional fallback: same secret, legacy env name. Migrate to
  // TAVILY_API_KEY / BRAVE_API_KEY in Vercel and delete the VITE_ variants.
  if (provider === 'tavily') return process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY || undefined;
  return process.env.BRAVE_API_KEY || process.env.VITE_BRAVE_API_KEY || undefined;
};

const runTavily = async (
  key: string,
  query: string,
  maxResults: number,
  searchDepth: string
): Promise<Response> => {
  const upstream = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: searchDepth,
      include_answer: true,
      include_raw_content: false,
      max_results: maxResults,
      include_domains: [],
      exclude_domains: [],
    }),
    redirect: 'manual',
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
  });
};

const runBrave = async (key: string, query: string, maxResults: number): Promise<Response> => {
  const target = new URL('https://api.search.brave.com/res/v1/web/search');
  target.searchParams.set('q', query);
  target.searchParams.set('count', String(maxResults));

  const upstream = await fetch(target, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': key,
    },
    redirect: 'manual',
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
  });
};

export function GET(request: Request): Response {
  const blocked = guardOrigin(request) ?? guardRateLimit(request, 'search', 120);
  if (blocked) return blocked;
  return json({
    tavily: Boolean(resolveKey('tavily', undefined)),
    brave: Boolean(resolveKey('brave', undefined)),
  });
}

export function PUT(): Response {
  return json({ error: 'Method not allowed' }, 405);
}

export async function POST(request: Request): Promise<Response> {
  const blocked = guardOrigin(request) ?? guardRateLimit(request, 'search', 60);
  if (blocked) return blocked;

  let payload: {
    provider?: unknown;
    query?: unknown;
    maxResults?: unknown;
    searchDepth?: unknown;
    userKey?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const provider = payload.provider === 'tavily' || payload.provider === 'brave' ? payload.provider : null;
  if (!provider) {
    return json({ error: 'Unknown search provider' }, 400);
  }
  if (typeof payload.query !== 'string' || payload.query.trim().length === 0) {
    return json({ error: 'Missing query' }, 400);
  }

  const key = resolveKey(provider, payload.userKey);
  if (!key) {
    return json({ error: `No ${provider} API key configured on the server` }, 503);
  }

  const maxResults = typeof payload.maxResults === 'number' && payload.maxResults > 0
    ? Math.min(Math.floor(payload.maxResults), 20)
    : 5;
  const searchDepth = payload.searchDepth === 'advanced' ? 'advanced' : 'basic';

  try {
    return provider === 'tavily'
      ? await runTavily(key, payload.query, maxResults, searchDepth)
      : await runBrave(key, payload.query, maxResults);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return json({ error: 'Client aborted' }, 499);
    }
    return json({ error: 'Search request failed' }, 502);
  }
}
