#!/usr/bin/env node
/* global process, console, Request, Response, ReadableStream, TextEncoder, TextDecoder, URL */
/**
 * Smoke tests for the server-side proxy handlers (api/chutes.ts, api/search.ts).
 *
 * Bundles both handlers with esbuild, stubs global fetch, and asserts the
 * security contract: platform-key injection, BYOK precedence, host allowlist,
 * error statuses, capability-probe shape, and SSE stream passthrough.
 * No network access and no real keys are used.
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

  const { default: chutes } = await import('file://' + join(work, 'chutes.mjs'));
  const { default: search } = await import('file://' + join(work, 'search.mjs'));

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

  const chutesPost = (body) =>
    new Request('http://localhost/api/chutes', { method: 'POST', body: JSON.stringify(body) });
  const searchPost = (body) =>
    new Request('http://localhost/api/search', { method: 'POST', body: JSON.stringify(body) });

  // ---- /api/chutes ----
  process.env.CHUTES_API_KEY = platformKey;
  let res = await chutes(chutesPost({ targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: { model: 'm', stream: true } }));
  assert.equal(res.status, 201, 'upstream status must pass through');
  assert.equal(calls[0].url, 'https://llm.chutes.ai/v1/chat/completions');
  assert.equal(calls[0].init.headers['Authorization'], 'Bearer ' + platformKey, 'platform key injected server-side');
  console.log('PASS chutes: platform key injected + upstream forwarded');

  await chutes(chutesPost({ targetUrl: 'https://vonkaiser-audiodojo.chutes.ai/speak', body: { text: 'hi' }, userKey: byokKey }));
  assert.equal(calls[1].init.headers['Authorization'], 'Bearer ' + byokKey, 'BYOK key wins when provided');
  console.log('PASS chutes: BYOK key forwarded');

  delete process.env.CHUTES_API_KEY;
  process.env.VITE_CHUTES_API_KEY = platformKey;
  await chutes(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
  assert.equal(calls[2].init.headers['Authorization'], 'Bearer ' + platformKey, 'legacy env fallback works');
  delete process.env.VITE_CHUTES_API_KEY;
  console.log('PASS chutes: legacy env fallback');

  for (const bad of ['https://evil.example.com/x', 'http://llm.chutes.ai/v1', 'https://llm.chutes.ai.evil.com/x', 'not-a-url', 'https://api.tavily.com/search']) {
    const r = await chutes(chutesPost({ targetUrl: bad, body: {} }));
    assert.equal(r.status, 400, 'must reject: ' + bad);
  }
  assert.equal(calls.length, 3, 'no upstream call for rejected targets');
  console.log('PASS chutes: allowlist rejects everything outside chutes.ai over https');

  assert.equal((await chutes(new Request('http://localhost/api/chutes', { method: 'GET' }))).status, 405);
  assert.equal((await chutes(new Request('http://localhost/api/chutes', { method: 'POST', body: 'nope' }))).status, 400);
  console.log('PASS chutes: GET -> 405, invalid JSON -> 400');

  const before503 = calls.length;
  assert.equal((await chutes(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }))).status, 503, 'missing key must 503');
  assert.equal(calls.length, before503, 'no upstream call without a key');
  console.log('PASS chutes: missing server key -> 503, no upstream call');

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
  const streamRes = await chutes(chutesPost({ targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: { stream: true } }));
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

  const probe = await search(new Request('http://localhost/api/search', { method: 'GET' }));
  assert.deepEqual(await probe.json(), { tavily: true, brave: false }, 'probe exposes booleans only');
  console.log('PASS search: GET capability probe');

  let searchRes = await search(searchPost({ provider: 'tavily', query: 'kenya domain', maxResults: 3, searchDepth: 'advanced' }));
  assert.equal(searchRes.status, 200);
  const tavilyUpstream = JSON.parse(calls[searchCallsFrom].init.body);
  assert.equal(calls[searchCallsFrom].url, 'https://api.tavily.com/search');
  assert.equal(tavilyUpstream.api_key, tavilyKey, 'platform key injected upstream');
  assert.equal(tavilyUpstream.search_depth, 'advanced');
  assert.equal(tavilyUpstream.max_results, 3);
  console.log('PASS search: tavily platform key injected upstream');

  await search(searchPost({ provider: 'tavily', query: 'q', userKey: byokKey }));
  assert.equal(JSON.parse(calls[searchCallsFrom + 1].init.body).api_key, byokKey, 'BYOK key wins');
  console.log('PASS search: tavily BYOK key wins');

  process.env.BRAVE_API_KEY = braveKey;
  searchRes = await search(searchPost({ provider: 'brave', query: 'hello world', maxResults: 7 }));
  assert.equal(searchRes.status, 200);
  const braveUpstream = calls[searchCallsFrom + 2];
  assert.ok(braveUpstream.url.startsWith('https://api.search.brave.com/res/v1/web/search?'), 'brave upstream url');
  assert.equal(new URL(braveUpstream.url).searchParams.get('q'), 'hello world', 'query survives encoding');
  assert.equal(new URL(braveUpstream.url).searchParams.get('count'), '7', 'maxResults maps to count');
  assert.equal(braveUpstream.init.headers['X-Subscription-Token'], braveKey, 'brave key injected as header upstream');
  console.log('PASS search: brave platform key injected upstream');

  delete process.env.BRAVE_API_KEY;
  const beforeBrave = calls.length;
  assert.equal((await search(searchPost({ provider: 'brave', query: 'x' }))).status, 503, 'missing key must 503');
  assert.equal(calls.length, beforeBrave, 'no upstream call without a key');
  console.log('PASS search: missing key -> 503, no upstream call');

  assert.equal((await search(searchPost({ provider: 'google', query: 'x' }))).status, 400);
  assert.equal((await search(searchPost({ provider: 'tavily', query: '' }))).status, 400);
  assert.equal((await search(new Request('http://localhost/api/search', { method: 'PUT' }))).status, 405);
  console.log('PASS search: validation (provider/query/method)');

  console.log('[api_smoke] PASS: all proxy handler assertions green.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
