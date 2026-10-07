#!/usr/bin/env node
/* global process, console, Request, Response, ReadableStream, TextEncoder, TextDecoder, URL */
/**
 * Smoke tests for the server-side proxy handlers (api/chutes.ts, api/search.ts).
 *
 * Bundles both handlers with esbuild, stubs global fetch, and asserts the
 * security contract: named Vercel method exports (default-export handlers 504
 * in production), origin guard, rate limit, platform-key injection, BYOK
 * precedence, host allowlist, error statuses, capability-probe shape, and SSE
 * stream passthrough. No network access and no real keys are used.
 *
 * Usage: node scripts/api_smoke.mjs
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'api-smoke-'));
const esbuildBin = join(root, 'node_modules', '.bin', 'esbuild');

if (!existsSync(esbuildBin)) {
  console.error('[api_smoke] FAIL: esbuild not found — run npm ci first.');
  process.exit(1);
}

const bundle = (entry, out) =>
  execFileSync(esbuildBin, [entry, '--bundle', '--format=esm', '--platform=node', '--outfile=' + join(work, out)], {
    cwd: root,
    stdio: 'pipe',
  });

try {
  bundle('api/chutes.ts', 'chutes.mjs');
  bundle('api/search.ts', 'search.mjs');

  // Vercel invokes NAMED method exports; a default-exported plain function is
  // never called and the route 504s in production — assert the export shape.
  const chutesMod = await import('file://' + join(work, 'chutes.mjs'));
  const searchMod = await import('file://' + join(work, 'search.mjs'));
  assert.equal(typeof chutesMod.POST, 'function', 'api/chutes.ts must export function POST');
  assert.equal(typeof chutesMod.GET, 'function', 'api/chutes.ts must export function GET');
  assert.equal(typeof chutesMod.default, 'undefined', 'api/chutes.ts must NOT default-export a plain handler');
  assert.equal(typeof searchMod.POST, 'function', 'api/search.ts must export function POST');
  assert.equal(typeof searchMod.GET, 'function', 'api/search.ts must export function GET');
  assert.equal(typeof searchMod.default, 'undefined', 'api/search.ts must NOT default-export a plain handler');
  console.log('PASS exports: named GET/POST present, no plain default handler');

  const platformKey = 'plat' + '-form-test-key';
  const byokKey = 'user' + '-byok-test-key';
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };

  const chutesPost = (body, headers = {}) =>
    new Request('http://localhost/api/chutes', { method: 'POST', body: JSON.stringify(body), headers });
  const searchPost = (body, headers = {}) =>
    new Request('http://localhost/api/search', { method: 'POST', body: JSON.stringify(body), headers });

  // ---- /api/chutes ----
  process.env.CHUTES_API_KEY = platformKey;
  let res = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: { model: 'm', stream: true } }));
  assert.equal(res.status, 201, 'upstream status must pass through');
  assert.equal(calls[0].url, 'https://llm.chutes.ai/v1/chat/completions');
  assert.equal(calls[0].init.headers['Authorization'], 'Bearer ' + platformKey, 'platform key injected server-side');
  assert.equal(calls[0].init.redirect, 'manual', 'upstream redirects must not be followed with the key attached');
  console.log('PASS chutes: platform key injected + upstream forwarded, redirect manual');

  await chutesMod.POST(chutesPost({ targetUrl: 'https://vonkaiser-audiodojo.chutes.ai/speak', body: { text: 'hi' }, userKey: byokKey }));
  assert.equal(calls[1].init.headers['Authorization'], 'Bearer ' + byokKey, 'BYOK key wins when provided');
  console.log('PASS chutes: BYOK key forwarded');

  delete process.env.CHUTES_API_KEY;
  process.env.VITE_CHUTES_API_KEY = platformKey;
  await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
  assert.equal(calls[2].init.headers['Authorization'], 'Bearer ' + platformKey, 'legacy env fallback works');
  delete process.env.VITE_CHUTES_API_KEY;
  console.log('PASS chutes: legacy env fallback');

  for (const bad of ['https://evil.example.com/x', 'http://llm.chutes.ai/v1', 'https://llm.chutes.ai.evil.com/x', 'not-a-url', 'https://api.tavily.com/search', 'https://llm.chutes.ai:8443/v1']) {
    const r = await chutesMod.POST(chutesPost({ targetUrl: bad, body: {} }));
    assert.equal(r.status, 400, 'must reject: ' + bad);
  }
  assert.equal(calls.length, 3, 'no upstream call for rejected targets');
  console.log('PASS chutes: allowlist rejects non-https, non-443, off-host and malformed targets');

  assert.equal((await chutesMod.GET(new Request('http://localhost/api/chutes', { method: 'GET' }))).status, 405);
  assert.equal((await chutesMod.POST(chutesPost({}))).status, 400);
  assert.equal((await chutesMod.POST(new Request('http://localhost/api/chutes', { method: 'POST', body: 'nope' }))).status, 400);
  console.log('PASS chutes: GET -> 405, invalid payloads -> 400');

  const before503 = calls.length;
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }))).status, 503, 'missing key must 503');
  assert.equal(calls.length, before503, 'no upstream call without a key');
  console.log('PASS chutes: missing server key -> 503, no upstream call');

  // Origin guard: foreign browser origin rejected; ours and previews allowed;
  // absent Origin (non-browser) allowed through to rate limiting.
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, { origin: 'https://evil.example.com' }))).status, 403, 'foreign origin -> 403');
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://nope.invalid/x', body: {} }, { origin: 'https://create.gashotech.com' }))).status, 400, 'own origin passes guard (fails later on allowlist)');
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://nope.invalid/x', body: {} }, { origin: 'https://gashochat-git-branch.vercel.app' }))).status, 400, 'preview origin passes guard');
  console.log('PASS chutes: origin guard (foreign 403, own/preview allowed, absent allowed)');

  process.env.CHUTES_API_KEY = platformKey;
  globalThis.fetch = async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: chunk-1\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const streamRes = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: { stream: true } }));
  assert.equal(streamRes.headers.get('content-type'), 'text/event-stream');
  const chunk = await streamRes.body.getReader().read();
  assert.ok(new TextDecoder().decode(chunk.value).includes('data: chunk-1'), 'SSE chunk streams through');
  console.log('PASS chutes: SSE stream passes through');

  // ---- /api/search ----
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ results: [{ title: 't', url: 'u', content: 'c' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const searchCallsFrom = calls.length;
  const tavilyKey = 'plat' + 'form-tavily-key';
  const braveKey = 'plat' + 'form-brave-key';
  process.env.TAVILY_API_KEY = tavilyKey;
  delete process.env.BRAVE_API_KEY;
  delete process.env.VITE_TAVILY_API_KEY;
  delete process.env.VITE_BRAVE_API_KEY;

  const probe = await searchMod.GET(new Request('http://localhost/api/search', { method: 'GET' }));
  assert.equal(probe.status, 200, 'probe must be instant 200 (deployed-504 regression guard)');
  assert.deepEqual(await probe.json(), { tavily: true, brave: false }, 'probe exposes booleans only');
  console.log('PASS search: GET capability probe instant 200');

  let searchRes = await searchMod.POST(searchPost({ provider: 'tavily', query: 'kenya domain', maxResults: 3, searchDepth: 'advanced' }));
  assert.equal(searchRes.status, 200);
  const tavilyUpstream = JSON.parse(calls[searchCallsFrom].init.body);
  assert.equal(calls[searchCallsFrom].url, 'https://api.tavily.com/search');
  assert.equal(tavilyUpstream.api_key, tavilyKey, 'platform key injected upstream');
  assert.equal(tavilyUpstream.search_depth, 'advanced');
  assert.equal(tavilyUpstream.max_results, 3);
  console.log('PASS search: tavily platform key injected upstream');

  await searchMod.POST(searchPost({ provider: 'tavily', query: 'q', userKey: byokKey }));
  assert.equal(JSON.parse(calls[searchCallsFrom + 1].init.body).api_key, byokKey, 'BYOK key wins');
  console.log('PASS search: tavily BYOK key wins');

  process.env.BRAVE_API_KEY = braveKey;
  searchRes = await searchMod.POST(searchPost({ provider: 'brave', query: 'hello world', maxResults: 7 }));
  assert.equal(searchRes.status, 200);
  const braveUpstream = calls[searchCallsFrom + 2];
  assert.ok(braveUpstream.url.startsWith('https://api.search.brave.com/res/v1/web/search?'), 'brave upstream url');
  assert.equal(new URL(braveUpstream.url).searchParams.get('q'), 'hello world', 'query survives encoding');
  assert.equal(new URL(braveUpstream.url).searchParams.get('count'), '7', 'maxResults maps to count');
  assert.equal(braveUpstream.init.headers['X-Subscription-Token'], braveKey, 'brave key injected as header upstream');
  console.log('PASS search: brave platform key injected upstream');

  delete process.env.BRAVE_API_KEY;
  const beforeBrave = calls.length;
  assert.equal((await searchMod.POST(searchPost({ provider: 'brave', query: 'x' }))).status, 503, 'missing key must 503');
  assert.equal(calls.length, beforeBrave, 'no upstream call without a key');
  console.log('PASS search: missing key -> 503, no upstream call');

  assert.equal((await searchMod.POST(searchPost({ provider: 'google', query: 'x' }))).status, 400);
  assert.equal((await searchMod.POST(searchPost({ provider: 'tavily', query: '' }))).status, 400);
  assert.equal((await searchMod.PUT(new Request('http://localhost/api/search', { method: 'PUT' }))).status, 405);
  assert.equal((await searchMod.POST(searchPost({ provider: 'tavily', query: 'x' }, { origin: 'https://phish.example.com' }))).status, 403, 'foreign origin -> 403');
  console.log('PASS search: validation (provider/query/method) + origin guard');

  // ---- Rate limiting (LAST: consumes the shared chutes bucket) ----
  process.env.CHUTES_API_KEY = platformKey;
  globalThis.fetch = async () => new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
  let saw429 = false;
  for (let i = 0; i < 80; i += 1) {
    const r = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
    if (r.status === 429) {
      saw429 = true;
      const retry = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
      assert.equal(retry.status, 429, 'rate limit must hold inside the window');
      break;
    }
    assert.ok(r.status === 201, 'unexpected status before limit: ' + r.status);
  }
  assert.ok(saw429, 'rate limiter must trip with 429 after the per-minute cap');
  console.log('PASS chutes: per-IP rate limit trips with 429 and holds');

  console.log('[api_smoke] PASS: all proxy handler assertions green.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
