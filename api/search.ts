/**
 * Server-side search proxy (Vercel serverless function).
 *
 * SECURITY CONTRACT: Tavily / Brave API keys NEVER reach the browser. Search
 * calls go through this route and the credential is injected here from
 * server-side environment variables (TAVILY_API_KEY / BRAVE_API_KEY).
 *
 * - POST { provider: 'tavily' | 'brave', query, maxResults?, searchDepth?, userKey? }
 *   -> runs the search upstream and returns its JSON verbatim. Requires a
 *   valid Clerk session JWT (Authorization: Bearer <token>).
 * - GET -> capability probe: { tavily: boolean, brave: boolean } (whether a
 *   platform key exists for each provider; never exposes key material).
 *   Unauthenticated on purpose: booleans only, no upstream call — the composer
 *   probe runs before sign-in.
 * - userKey is an optional BYOK key; when absent the platform key is used.
 * - Guards: Clerk session auth + browser-Origin allowlist + per-IP rate
 *   limiting (all inlined in this file — see the sections below).
 * - Every locally generated error response carries `X-Proxy-Error: 1` so the
 *   client knows it is the proxy speaking (no point retrying) as opposed to a
 *   retryable upstream failure.
 *
 * HANDLER SIGNATURE: Vercel requires named method exports (`export function
 * GET/POST(request: Request)`) — a plain default-exported function is never
 * invoked and the function 504s. Verified against
 * https://vercel.com/docs/functions/runtimes/node-js
 */

import { createPublicKey, verify as nodeVerify, type KeyObject } from 'node:crypto';

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
    return json({ error: 'Rate limit exceeded, retry shortly' }, 429, { 'Retry-After': '60' });
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return null;
};
// ---- End request guards ----

// ---- Client session auth (Clerk JWKS via node:crypto) (INLINED on purpose —
// same rule as the request guards; KEEP THIS BLOCK BYTE-IDENTICAL across both
// proxy handlers. scripts/api_smoke.mjs asserts the two copies match.) ----

/** Error responses are marked so clients never retry the proxy itself. */
const PROXY_ERROR_HEADERS = { 'X-Proxy-Error': '1' };

const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...PROXY_ERROR_HEADERS, ...headers },
  });

/**
 * Clerk issuer: CLERK_ISSUER env override, else derived from the publishable
 * key (pk_test_/pk_live_ + base64url("<frontend-api-domain>$")).
 */
const clerkIssuer = (): string | null => {
  const explicit = process.env.CLERK_ISSUER;
  if (explicit && explicit.trim()) return explicit.trim().replace(/\/+$/, '');
  const pk = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  const m = /^pk_(?:test|live)_(.+)$/.exec(pk);
  if (!m) return null;
  try {
    const domain = Buffer.from(m[1], 'base64url').toString('utf8').replace(/\$$/, '');
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(domain)) return null;
    return `https://${domain}`;
  } catch {
    return null;
  }
};

const clerkJwksUrl = (issuer: string): string =>
  process.env.CLERK_JWKS_URL || `${issuer}/.well-known/jwks.json`;

let jwksCache: { keys: Map<string, KeyObject>; fetchedAt: number; url: string } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

const loadJwks = async (url: string, force: boolean): Promise<Map<string, KeyObject>> => {
  if (!force && jwksCache && jwksCache.url === url && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(url, { headers: { accept: 'application/json' }, redirect: 'manual' });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: Array<Record<string, unknown>> };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys || []) {
    if (typeof jwk.kid !== 'string' || jwk.kty !== 'RSA') continue;
    try {
      keys.set(jwk.kid, createPublicKey({ key: jwk as never, format: 'jwk' }));
    } catch {
      // skip unusable entries
    }
  }
  if (keys.size === 0) throw new Error('JWKS contained no usable RSA keys');
  jwksCache = { keys, fetchedAt: Date.now(), url };
  return keys;
};

/**
 * Verify a Clerk session JWT (RS256) against Clerk's JWKS. Returns null when
 * the request is authenticated, or the 401/503 Response to send instead.
 */
const requireSession = async (request: Request): Promise<Response | null> => {
  const issuer = clerkIssuer();
  if (!issuer) {
    return json({ error: 'Auth not configured on the server' }, 503);
  }
  const header = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return json({ error: 'Authentication required' }, 401);
  const token = m[1].trim();
  const parts = token.split('.');
  if (parts.length !== 3) return json({ error: 'Invalid session token' }, 401);

  let headerJson: { alg?: string; kid?: string };
  let payload: { iss?: string; exp?: number; nbf?: number };
  try {
    headerJson = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return json({ error: 'Invalid session token' }, 401);
  }

  // RS256 only. Explicitly reject `alg: none` and anything else (fail closed).
  if (headerJson.alg !== 'RS256' || typeof headerJson.kid !== 'string') {
    return json({ error: 'Invalid session token' }, 401);
  }
  if (payload.iss !== issuer) return json({ error: 'Invalid session token' }, 401);
  const now = Date.now();
  const skewMs = 60_000;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now - skewMs) {
    return json({ error: 'Session token expired' }, 401);
  }
  if (typeof payload.nbf === 'number' && payload.nbf * 1000 > now + skewMs) {
    return json({ error: 'Session token not yet valid' }, 401);
  }

  const jwksUrl = clerkJwksUrl(issuer);
  let key: KeyObject | undefined;
  try {
    let keys = await loadJwks(jwksUrl, false);
    key = keys.get(headerJson.kid);
    if (!key) {
      // Unknown kid: force one refresh (key rotation), then give up.
      keys = await loadJwks(jwksUrl, true);
      key = keys.get(headerJson.kid);
    }
  } catch {
    return json({ error: 'Auth verification unavailable' }, 503);
  }
  if (!key) return json({ error: 'Invalid session token' }, 401);

  const signatureOk = nodeVerify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    Buffer.from(parts[2], 'base64url')
  );
  if (!signatureOk) return json({ error: 'Invalid session token' }, 401);
  return null;
};
// ---- End client session auth ----

const resolveKey = (provider: 'tavily' | 'brave', userKey: unknown): string | undefined => {
  if (typeof userKey === 'string' && userKey.trim().length > 0) return userKey.trim();
  // Plain server-side names only. The transitional VITE_ fallbacks were removed
  // 2026-10-08 after the Vercel env migration to TAVILY_API_KEY (Vite inlines
  // VITE_* names into the public bundle — never read secrets from them).
  if (provider === 'tavily') return process.env.TAVILY_API_KEY || undefined;
  return process.env.BRAVE_API_KEY || undefined;
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
  // Capability probe stays unauthenticated: booleans only, no upstream call.
  return new Response(
    JSON.stringify({
      tavily: Boolean(resolveKey('tavily', undefined)),
      brave: Boolean(resolveKey('brave', undefined)),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export function PUT(): Response {
  return json({ error: 'Method not allowed' }, 405);
}

export async function POST(request: Request): Promise<Response> {
  const blocked = guardOrigin(request) ?? guardRateLimit(request, 'search', 60);
  if (blocked) return blocked;
  const unauthed = await requireSession(request);
  if (unauthed) return unauthed;

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
