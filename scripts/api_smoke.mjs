#!/usr/bin/env node
/* global process, console, Request, Response, ReadableStream, TextEncoder, TextDecoder, URL, Buffer */
/**
 * Smoke tests for the server-side proxy handlers (api/chutes.ts, api/search.ts).
 *
 * Bundles both handlers with esbuild, stubs global fetch (with a local JWKS
 * endpoint for the Clerk session-auth path), and asserts the security
 * contract: named Vercel method exports (default-export handlers 504 in
 * production), Clerk session auth (incl. positive controls — forged, expired,
 * wrong-issuer and wrong-key tokens MUST fail), origin guard, rate limit,
 * platform-key injection, BYOK precedence, host allowlist, error statuses,
 * capability-probe shape, request-body cap, and SSE stream passthrough. No
 * network access and no real keys are used.
 *
 * Usage: node scripts/api_smoke.mjs
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
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
  // ---- Inlined-auth sync check: the JWKS block must stay byte-identical in
  // both handlers (they cannot share a module on Vercel — ERR_MODULE_NOT_FOUND).
  const extractAuthBlock = (file) => {
    const src = readFileSync(join(root, file), 'utf8');
    const startMarker = '// ---- Client session auth (Clerk JWKS via node:crypto) (INLINED on purpose —';
    const endMarker = '// ---- End client session auth ----';
    const start = src.indexOf(startMarker);
    const end = src.indexOf(endMarker);
    assert.ok(start !== -1 && end !== -1, `${file}: auth block markers missing`);
    return src.slice(start, end + endMarker.length);
  };
  const chutesAuth = extractAuthBlock('api/chutes.ts');
  const searchAuth = extractAuthBlock('api/search.ts');
  assert.equal(chutesAuth, searchAuth, 'api/chutes.ts and api/search.ts auth blocks must be byte-identical');
  console.log('PASS sync: inlined Clerk auth block identical in both handlers');

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

  // ---- Test identity: RSA keypair + JWKS served through the fetch stub ----
  const testIssuer = 'https://auth.test.example';
  process.env.CLERK_ISSUER = testIssuer;
  process.env.CLERK_JWKS_URL = testIssuer + '/.well-known/jwks.json';
  delete process.env.VITE_CLERK_PUBLISHABLE_KEY;

  const { publicKey: testPub, privateKey: testPriv } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { privateKey: roguePriv } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const testJwk = { ...testPub.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256' };
  const rotatedJwk = { ...testPub.export({ format: 'jwk' }), kid: 'rotated-kid', alg: 'RS256' };
  let servedJwks = { keys: [testJwk] };

  const mintToken = (payloadOverrides = {}, { key = testPriv, kid = 'test-kid', alg = 'RS256' } = {}) => {
    const h = Buffer.from(JSON.stringify({ alg, typ: 'JWT', kid })).toString('base64url');
    const p = Buffer.from(JSON.stringify({
      iss: testIssuer,
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'user_test',
      ...payloadOverrides,
    })).toString('base64url');
    const sig = nodeSign('RSA-SHA256', Buffer.from(h + '.' + p), key).toString('base64url');
    return `${h}.${p}.${sig}`;
  };
  const validToken = mintToken();

  const platformKey = 'plat' + '-form-test-key';
  const byokKey = 'user' + '-byok-test-key';
  const calls = [];
  let upstreamResponder = () =>
    new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'content-type': 'application/json' } });

  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/.well-known/jwks.json')) {
      return new Response(JSON.stringify(servedJwks), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    calls.push({ url: u, init });
    return upstreamResponder(u, init);
  };

  const chutesPost = (body, headers = {}) =>
    new Request('http://localhost/api/chutes', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { authorization: 'Bearer ' + validToken, ...headers },
    });
  const searchPost = (body, headers = {}) =>
    new Request('http://localhost/api/search', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { authorization: 'Bearer ' + validToken, ...headers },
    });

  // ---- Clerk session auth ----
  let noAuth = await chutesMod.POST(new Request('http://localhost/api/chutes', {
    method: 'POST',
    body: JSON.stringify({ targetUrl: 'https://llm.chutes.ai/x', body: {} }),
  }));
  assert.equal(noAuth.status, 401, 'missing Authorization header -> 401');
  assert.equal(noAuth.headers.get('x-proxy-error'), '1', 'proxy-generated 401 must carry X-Proxy-Error: 1');
  assert.equal(calls.length, 0, 'no upstream call without auth');
  console.log('PASS auth: missing token -> 401 (X-Proxy-Error: 1), no upstream call');

  for (const [label, token] of [
    ['garbage token', 'not.a.jwt'],
    ['alg none', (() => {
      const h = Buffer.from(JSON.stringify({ alg: 'none', kid: 'test-kid' })).toString('base64url');
      const p = Buffer.from(JSON.stringify({ iss: testIssuer, exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url');
      return `${h}.${p}.`;
    })()],
    ['tampered payload', (() => {
      const good = mintToken();
      const [h, , s] = good.split('.');
      const evil = Buffer.from(JSON.stringify({ iss: testIssuer, exp: Math.floor(Date.now() / 1000) + 300, sub: 'user_admin' })).toString('base64url');
      return `${h}.${evil}.${s}`;
    })()],
    ['wrong key (same kid)', mintToken({}, { key: roguePriv })],
    ['expired token', mintToken({ exp: Math.floor(Date.now() / 1000) - 300 })],
    ['wrong issuer', mintToken({ iss: 'https://evil-issuer.example' })],
    ['not-yet-valid token', mintToken({ nbf: Math.floor(Date.now() / 1000) + 3600 })],
  ]) {
    const r = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, { authorization: 'Bearer ' + token }));
    assert.equal(r.status, 401, `${label} must be rejected with 401`);
    assert.equal(r.headers.get('x-proxy-error'), '1', `${label}: X-Proxy-Error: 1`);
  }
  assert.equal(calls.length, 0, 'forged/expired/rogue tokens must never reach upstream');
  console.log('PASS auth: forged, alg-none, tampered, rogue-key, expired, wrong-issuer tokens all 401 (positive controls)');

  // JWKS key rotation: unknown kid forces one refresh; a rotated key then works.
  let res = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, { authorization: 'Bearer ' + mintToken({}, { kid: 'rotated-kid' }) }));
  assert.equal(res.status, 401, 'unknown kid not yet rotated must 401');
  servedJwks = { keys: [testJwk, rotatedJwk] };
  res = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, { authorization: 'Bearer ' + mintToken({}, { kid: 'rotated-kid' }) }));
  assert.equal(res.status, 201, 'rotated kid must verify after JWKS refresh');
  console.log('PASS auth: JWKS kid rotation — unknown kid 401s, then verifies after refresh');

  // Issuer derivation from the Clerk publishable key (no CLERK_ISSUER env).
  delete process.env.CLERK_ISSUER;
  process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_' + Buffer.from('my-app.clerk.accounts.dev$').toString('base64url');
  process.env.CLERK_JWKS_URL = 'https://my-app.clerk.accounts.dev/.well-known/jwks.json';
  res = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, {
    authorization: 'Bearer ' + mintToken({ iss: 'https://my-app.clerk.accounts.dev' }),
  }));
  assert.equal(res.status, 201, 'issuer derived from publishable key must verify');
  assert.equal(calls[calls.length - 1].url, 'https://llm.chutes.ai/x');
  delete process.env.VITE_CLERK_PUBLISHABLE_KEY;
  process.env.CLERK_ISSUER = testIssuer;
  process.env.CLERK_JWKS_URL = testIssuer + '/.well-known/jwks.json';
  console.log('PASS auth: issuer derived from VITE_CLERK_PUBLISHABLE_KEY when CLERK_ISSUER is absent');

  // ---- /api/chutes ----
  process.env.CHUTES_API_KEY = platformKey;
  const chutesCallsFrom = calls.length;
  res = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: { model: 'm', stream: true } }));
  assert.equal(res.status, 201, 'upstream status must pass through');
  assert.equal(calls[chutesCallsFrom].url, 'https://llm.chutes.ai/v1/chat/completions');
  assert.equal(calls[chutesCallsFrom].init.headers['Authorization'], 'Bearer ' + platformKey, 'platform key injected server-side');
  assert.equal(calls[chutesCallsFrom].init.redirect, 'manual', 'upstream redirects must not be followed with the key attached');
  console.log('PASS chutes: platform key injected + upstream forwarded, redirect manual');

  await chutesMod.POST(chutesPost({ targetUrl: 'https://vonkaiser-audiodojo.chutes.ai/speak', body: { text: 'hi' }, userKey: byokKey }));
  assert.equal(calls[chutesCallsFrom + 1].init.headers['Authorization'], 'Bearer ' + byokKey, 'BYOK key wins when provided');
  console.log('PASS chutes: BYOK key forwarded');

  // Security tripwire: the legacy VITE_ name must NOT resolve a key. Vite
  // inlines VITE_* vars into the public client bundle, so that fallback was
  // removed in the 2026-10-07 leak sweep (5457c40) — bringing it back would
  // recreate the leak. Assert 503 + no upstream call, not the old fallback.
  delete process.env.CHUTES_API_KEY;
  process.env.VITE_CHUTES_API_KEY = platformKey;
  const legacyCalls = calls.length;
  const legacyRes = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
  assert.equal(legacyRes.status, 503, 'legacy VITE_ env name must NOT resolve a key');
  assert.equal(legacyRes.headers.get('x-proxy-error'), '1', 'proxy-generated 503 must carry X-Proxy-Error: 1');
  assert.equal(calls.length, legacyCalls, 'no upstream call on the legacy name');
  delete process.env.VITE_CHUTES_API_KEY;
  console.log('PASS chutes: legacy VITE_ env fallback removed (503, no upstream call)');

  for (const bad of ['https://evil.example.com/x', 'http://llm.chutes.ai/v1', 'https://llm.chutes.ai.evil.com/x', 'not-a-url', 'https://api.tavily.com/search', 'https://llm.chutes.ai:8443/v1']) {
    const r = await chutesMod.POST(chutesPost({ targetUrl: bad, body: {} }));
    assert.equal(r.status, 400, 'must reject: ' + bad);
    assert.equal(r.headers.get('x-proxy-error'), '1', 'proxy-generated 400 must carry X-Proxy-Error: 1');
  }
  assert.equal(calls.length, chutesCallsFrom + 2, 'no upstream call for rejected targets');
  console.log('PASS chutes: allowlist rejects non-https, non-443, off-host and malformed targets');

  assert.equal((await chutesMod.GET(new Request('http://localhost/api/chutes', { method: 'GET' }))).status, 405);
  assert.equal((await chutesMod.POST(chutesPost({}))).status, 400);
  assert.equal((await chutesMod.POST(new Request('http://localhost/api/chutes', { method: 'POST', body: 'nope', headers: { authorization: 'Bearer ' + validToken } }))).status, 400);
  console.log('PASS chutes: GET -> 405, invalid payloads -> 400');

  const before503 = calls.length;
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }))).status, 503, 'missing key must 503');
  assert.equal(calls.length, before503, 'no upstream call without a key');
  console.log('PASS chutes: missing server key -> 503, no upstream call');

  // Request-body cap: Vercel truncates/rejects bodies >~4.5MB, so the handler
  // must fail fast with 413 before relaying a doomed payload.
  const fatBody = { targetUrl: 'https://llm.chutes.ai/x', body: { blob: 'x'.repeat(4_600_000) } };
  const fatRes = await chutesMod.POST(new Request('http://localhost/api/chutes', {
    method: 'POST',
    body: JSON.stringify(fatBody),
    headers: { authorization: 'Bearer ' + validToken },
  }));
  assert.equal(fatRes.status, 413, 'oversized body must 413');
  assert.equal(fatRes.headers.get('x-proxy-error'), '1', '413 must carry X-Proxy-Error: 1');
  console.log('PASS chutes: request body over the platform cap -> 413, no upstream call');

  // Origin guard: foreign browser origin rejected; ours and previews allowed;
  // absent Origin (non-browser) allowed through to rate limiting.
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }, { origin: 'https://evil.example.com' }))).status, 403, 'foreign origin -> 403');
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://nope.invalid/x', body: {} }, { origin: 'https://create.gashotech.com' }))).status, 400, 'own origin passes guard (fails later on allowlist)');
  assert.equal((await chutesMod.POST(chutesPost({ targetUrl: 'https://nope.invalid/x', body: {} }, { origin: 'https://gashochat-git-branch.vercel.app' }))).status, 400, 'preview origin passes guard');
  console.log('PASS chutes: origin guard (foreign 403, own/preview allowed, absent allowed)');

  process.env.CHUTES_API_KEY = platformKey;
  upstreamResponder = () => {
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
  upstreamResponder = () =>
    new Response(JSON.stringify({ results: [{ title: 't', url: 'u', content: 'c' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const searchCallsFrom = calls.length;
  const tavilyKey = 'plat' + 'form-tavily-key';
  const braveKey = 'plat' + 'form-brave-key';
  process.env.TAVILY_API_KEY = tavilyKey;
  delete process.env.BRAVE_API_KEY;
  delete process.env.VITE_TAVILY_API_KEY;
  delete process.env.VITE_BRAVE_API_KEY;

  // The probe is unauthenticated on purpose (booleans only, no upstream call).
  const probe = await searchMod.GET(new Request('http://localhost/api/search', { method: 'GET' }));
  assert.equal(probe.status, 200, 'probe must be instant 200 (deployed-504 regression guard)');
  assert.deepEqual(await probe.json(), { tavily: true, brave: false }, 'probe exposes booleans only');
  console.log('PASS search: GET capability probe instant 200, unauthenticated (booleans only)');

  assert.equal((await searchMod.POST(new Request('http://localhost/api/search', {
    method: 'POST',
    body: JSON.stringify({ provider: 'tavily', query: 'q' }),
  }))).status, 401, 'search POST without auth -> 401');
  assert.equal((await searchMod.POST(new Request('http://localhost/api/search', {
    method: 'POST',
    body: JSON.stringify({ provider: 'tavily', query: 'q' }),
    headers: { authorization: 'Bearer ' + mintToken({}, { key: roguePriv }) },
  }))).status, 401, 'search POST with forged token -> 401');
  console.log('PASS search: POST requires a valid Clerk session');

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

  // Same security tripwire as the Chutes key: the transitional VITE_ fallbacks
  // were removed 2026-10-08 after the env migration to TAVILY_API_KEY —
  // Vite inlines VITE_* names into the public bundle, so they must never
  // resolve a secret again.
  process.env.VITE_TAVILY_API_KEY = tavilyKey;
  delete process.env.TAVILY_API_KEY;
  const beforeLegacySearch = calls.length;
  const legacySearchRes = await searchMod.POST(searchPost({ provider: 'tavily', query: 'x' }));
  assert.equal(legacySearchRes.status, 503, 'legacy VITE_TAVILY_API_KEY must NOT resolve a key');
  assert.equal(calls.length, beforeLegacySearch, 'no upstream call on the legacy name');
  delete process.env.VITE_TAVILY_API_KEY;
  console.log('PASS search: legacy VITE_ env fallback removed (503, no upstream call)');

  assert.equal((await searchMod.POST(searchPost({ provider: 'google', query: 'x' }))).status, 400);
  assert.equal((await searchMod.POST(searchPost({ provider: 'tavily', query: '' }))).status, 400);
  assert.equal((await searchMod.PUT(new Request('http://localhost/api/search', { method: 'PUT' }))).status, 405);
  assert.equal((await searchMod.POST(searchPost({ provider: 'tavily', query: 'x' }, { origin: 'https://phish.example.com' }))).status, 403, 'foreign origin -> 403');
  console.log('PASS search: validation (provider/query/method) + origin guard');

  // ---- Rate limiting (LAST: consumes the shared chutes bucket) ----
  process.env.CHUTES_API_KEY = platformKey;
  upstreamResponder = () => new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
  let saw429 = false;
  for (let i = 0; i < 80; i += 1) {
    const r = await chutesMod.POST(chutesPost({ targetUrl: 'https://llm.chutes.ai/x', body: {} }));
    if (r.status === 429) {
      saw429 = true;
      assert.equal(r.headers.get('x-proxy-error'), '1', 'proxy-generated 429 must carry X-Proxy-Error: 1');
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
