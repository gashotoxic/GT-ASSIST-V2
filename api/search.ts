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

import { guardOrigin, guardRateLimit } from '../lib/apiGuard';

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
