/**
 * Server-side Chutes proxy (Vercel serverless function).
 *
 * SECURITY CONTRACT: the Chutes API key NEVER reaches the browser. All Chutes
 * calls from the client go through this route; the Authorization header is
 * injected here from a server-side environment variable (CHUTES_API_KEY).
 *
 * - POST { targetUrl, body, userKey? } -> forwards a JSON POST to targetUrl.
 *   Requires a valid Clerk session JWT (Authorization: Bearer <token>).
 * - targetUrl must be https on port 443 at chutes.ai / *.chutes.ai (allowlist =
 *   SSRF guard) and upstream redirects are not followed (keeps the injected
 *   Authorization on-allowlist).
 * - userKey is an optional BYOK key; when absent the platform key is used.
 * - The upstream response (status, content-type, body incl. SSE streams and
 *   binary blobs) is passed straight through.
 * - Guards: Clerk session auth + browser-Origin allowlist + per-IP rate
 *   limiting + request-body size cap (all inlined in this file).
 * - Every locally generated error response carries `X-Proxy-Error: 1` so the
 *   client knows it is the proxy speaking (no point retrying) as opposed to a
 *   retryable upstream failure.
 *
 * HANDLER SIGNATURE: Vercel requires named method exports (`export function
 * POST(request: Request)`) or `export default { fetch() {} }` for the web
 * standard — a plain default-exported function is never invoked and the
 * function 504s. Verified against https://vercel.com/docs/functions/runtimes/node-js
 */

import { createPublicKey, verify as nodeVerify, type KeyObject } from 'node:crypto';

// 300s is the Vercel Hobby maximum (Fluid Compute raised the cap from 60s —
// vercel.com/docs/functions/limitations). Long media generations (video, lip
// sync) can exceed the old 60s and would have been killed mid-relay.
export const config = { maxDuration: 300, supportsResponseStreaming: true };

// Vercel's platform request-body cap is ~4.5MB (vercel.com/docs/functions/limitations).
// Fail fast with a clear 413 instead of letting the platform truncate the body
// mid-relay (base64 media inputs — lip sync video/audio — are the risk here).
const MAX_REQUEST_BODY_BYTES = 4_500_000;

// ---- Request guards (INLINED on purpose: Vercel does not bundle relative
// cross-directory imports for /api functions — a shared module fails at
// runtime with ERR_MODULE_NOT_FOUND. Keep in sync with api/search.ts.) ----

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

const PLATFORM_HOST = 'chutes.ai';

const isAllowedTarget = (raw: unknown): raw is string => {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.port !== '' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  return host === PLATFORM_HOST || host.endsWith(`.${PLATFORM_HOST}`);
};

const resolveApiKey = (userKey: unknown): string | undefined => {
  if (typeof userKey === 'string' && userKey.trim().length > 0) return userKey.trim();
  // Server-side only. The public VITE_ variant was removed after the 2026-10-07
  // key-leak sweep (Vite inlines VITE_* vars into the public client bundle).
  // Set CHUTES_API_KEY in Vercel env (server scope). Never reintroduce a VITE_ secret.
  return process.env.CHUTES_API_KEY || undefined;
};

export async function POST(request: Request): Promise<Response> {
  const blocked = guardOrigin(request) ?? guardRateLimit(request, 'chutes', 60);
  if (blocked) return blocked;
  const unauthed = await requireSession(request);
  if (unauthed) return unauthed;

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    return json({ error: `Request body too large (max ${MAX_REQUEST_BODY_BYTES} bytes) — pass media inputs as URLs` }, 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  // content-length is not always present (chunked bodies), so enforce the cap
  // on the measured body too before JSON.parse allocates any structure.
  if (raw.length > MAX_REQUEST_BODY_BYTES) {
    return json({ error: `Request body too large (max ${MAX_REQUEST_BODY_BYTES} bytes) — pass media inputs as URLs` }, 413);
  }

  let payload: { targetUrl?: unknown; body?: unknown; userKey?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isAllowedTarget(payload.targetUrl)) {
    return json({ error: 'Target URL not allowed' }, 400);
  }

  const apiKey = resolveApiKey(payload.userKey);
  if (!apiKey) {
    return json({ error: 'Chutes API key not configured on the server' }, 503);
  }

  let upstream: Response;
  try {
    upstream = await fetch(payload.targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.body ?? {}),
      signal: request.signal,
      redirect: 'manual',
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return json({ error: 'Client aborted' }, 499);
    }
    return json({ error: 'Upstream request failed' }, 502);
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  return new Response(upstream.body, { status: upstream.status, headers });
}

export function GET(): Response {
  return json({ error: 'Method not allowed' }, 405);
}
