/**
 * Server-side Chutes proxy (Vercel serverless function).
 *
 * SECURITY CONTRACT: the Chutes API key NEVER reaches the browser. All Chutes
 * calls from the client go through this route; the Authorization header is
 * injected here from server-side environment variables (CHUTES_API_KEY, with a
 * transitional fallback to VITE_CHUTES_API_KEY until the Vercel env is
 * migrated).
 *
 * - POST { targetUrl, body, userKey? } -> forwards a JSON POST to targetUrl.
 * - targetUrl must be https on port 443 at chutes.ai / *.chutes.ai (allowlist =
 *   SSRF guard) and upstream redirects are not followed (keeps the injected
 *   Authorization on-allowlist).
 * - userKey is an optional BYOK key; when absent the platform key is used.
 * - The upstream response (status, content-type, body incl. SSE streams and
 *   binary blobs) is passed straight through.
 * - Guards: browser-Origin allowlist (lib/apiGuard) + per-IP rate limiting.
 *
 * HANDLER SIGNATURE: Vercel requires named method exports (`export function
 * POST(request: Request)`) or `export default { fetch() {} }` for the web
 * standard — a plain default-exported function is never invoked and the
 * function 504s. Verified against https://vercel.com/docs/functions/runtimes/node-js
 */

// 60s is deploy-safe on every Vercel plan (Hobby cap). Raise to 300 on Pro if
// long media generations need more headroom.
export const config = { maxDuration: 60, supportsResponseStreaming: true };

import { guardOrigin, guardRateLimit } from '../lib/apiGuard';

const PLATFORM_HOST = 'chutes.ai';

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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
  // Transitional fallback: same secret, legacy env name. Migrate to
  // CHUTES_API_KEY in Vercel and delete the VITE_ variant.
  return process.env.CHUTES_API_KEY || process.env.VITE_CHUTES_API_KEY || undefined;
};

export async function POST(request: Request): Promise<Response> {
  const blocked = guardOrigin(request) ?? guardRateLimit(request, 'chutes', 60);
  if (blocked) return blocked;

  let payload: { targetUrl?: unknown; body?: unknown; userKey?: unknown };
  try {
    payload = await request.json();
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
