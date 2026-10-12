#!/usr/bin/env node
/* global process, console, Response, setTimeout */
/**
 * Smoke tests for services/queryCache.ts (tier1: repeatQueriesCached).
 *
 * Asserts the cache contract with a stubbed Supabase REST endpoint:
 *   - key normalization: whitespace/case-folded search queries, stable JSON,
 *     volatile message fields (id/timestamp) never change the chat key
 *   - per-user keying: two users never share a cache key
 *   - hit observability: a hit bumps hit_count AND logs a model_call_log row
 *     with cache_hit = true (the proof mechanism, spec §3b)
 *   - never cached: empty values and secret-shaped responses are refused
 *   - TTL sanity: reads filter expires_at > now (expired rows are inert),
 *     writes stamp expires_at = now + TTL
 *
 * Usage: node scripts/query_cache_smoke.mjs
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'qcache-smoke-'));
const esbuildBin = join(root, 'node_modules', '.bin', 'esbuild');

if (!existsSync(esbuildBin)) {
  console.error('[query_cache_smoke] FAIL: esbuild not found — run npm ci first.');
  process.exit(1);
}

const bundle = (entry, out) =>
  execFileSync(esbuildBin, [entry, '--bundle', '--format=esm', '--platform=node', '--outfile=' + join(work, out)], {
    cwd: root,
    stdio: 'pipe',
  });

// One bundle exporting both modules so they share a single userContext instance.
const entryPath = join(work, 'entry.mjs');
writeFileSync(
  entryPath,
  `export * from ${JSON.stringify(join(root, 'services/queryCache.ts'))};\n` +
    `export { setAppUserContext, getAppUserContext } from ${JSON.stringify(join(root, 'services/userContext.ts'))};\n`
);

try {
  bundle(entryPath, 'queryCache.mjs');
  const qc = await import('file://' + join(work, 'queryCache.mjs'));

  // ---- pure helpers ------------------------------------------------------
  assert.equal(qc.normalizeQuery('  Hello   World \n'), 'hello world');
  assert.equal(qc.normalizeQuery('KENYA  Domain'), 'kenya domain');
  console.log('PASS: query normalization (trim, collapse whitespace, lowercase)');

  assert.equal(qc.stableStringify({ a: 1, b: { c: 2, d: 3 } }), qc.stableStringify({ b: { d: 3, c: 2 }, a: 1 }));
  console.log('PASS: stableStringify is key-order independent');

  const msgs1 = [
    { role: 'user', content: 'hi', id: 'm-1', timestamp: 111 },
    { role: 'assistant', content: 'yo', id: 'm-2', timestamp: 222 },
  ];
  const msgs2 = [
    { role: 'user', content: 'hi', id: 'DIFFERENT', timestamp: 999 },
    { role: 'assistant', content: 'yo', id: 'ALSO-DIFFERENT', timestamp: 888 },
  ];
  const k1 = await qc.computeCacheKey('chat', 'u1', 'model-x', qc.stableStringify(qc.normalizeMessagesForKey(msgs1)), {});
  const k2 = await qc.computeCacheKey('chat', 'u1', 'model-x', qc.stableStringify(qc.normalizeMessagesForKey(msgs2)), {});
  assert.equal(k1, k2, 'volatile message fields must not change the chat key');
  console.log('PASS: chat key ignores volatile ids/timestamps (exact content match)');

  const kUser2 = await qc.computeCacheKey('chat', 'u2', 'model-x', qc.stableStringify(qc.normalizeMessagesForKey(msgs1)), {});
  assert.notEqual(k1, kUser2, 'different users never share a cache key');
  const kModel = await qc.computeCacheKey('chat', 'u1', 'model-y', qc.stableStringify(qc.normalizeMessagesForKey(msgs1)), {});
  assert.notEqual(k1, kModel, 'different model = different key');
  const kNorm1 = await qc.computeCacheKey('search', 'u1', 'tavily', qc.normalizeQuery('Kenya  Domain'), {});
  const kNorm2 = await qc.computeCacheKey('search', 'u1', 'tavily', qc.normalizeQuery('kenya domain'), {});
  assert.equal(kNorm1, kNorm2, 'normalized search queries share a key');
  console.log('PASS: keys are per-user, per-model, and normalization-stable');

  // ---- REST contract -----------------------------------------------------
  qc.setAppUserContext({ userId: 'user_test1', accessToken: 'tok', supabaseUrl: 'https://sb.test', supabaseKey: 'anon' });

  const calls = [];
  let nextGetRows = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.includes('/query_cache?') && (!init.method || init.method === 'GET')) {
      return new Response(JSON.stringify(nextGetRows), { status: 200 });
    }
    return new Response('', { status: 201 });
  };

  const fakeKeyShape = 'tvly-' + 'q7WzK2mP9xL4nR8vT1yB';
  const searchCtx = {
    query: 'kenya domain', originalQuery: 'Kenya Domain', strategy: 'quick',
    results: [{ title: 't', url: 'https://e.com', content: 'c', snippet: 'c' }],
    synthesizedContext: 'text', sources: [{ index: 1, title: 't', url: 'https://e.com', domain: 'e.com' }],
    searchTime: 5,
  };

  // -- write path ----------------------------------------------------------
  await qc.setCachedSearch({ userId: 'user_test1', provider: 'tavily', query: 'Kenya Domain', maxResults: 5, searchDepth: 'basic', context: searchCtx });
  const post = calls.find((c) => (c.init.method === 'POST') && c.url.includes('/query_cache'));
  assert.ok(post, 'cache write POSTs to query_cache');
  assert.ok(post.url.includes('on_conflict=cache_key'), 'upsert by cache_key');
  const body = JSON.parse(post.init.body);
  assert.equal(body.user_id, 'user_test1');
  assert.equal(body.kind, 'search');
  assert.equal(body.hit_count, 0);
  const ttl = new Date(body.expires_at) - new Date(body.created_at);
  assert.ok(Math.abs(ttl - qc.SEARCH_CACHE_TTL_MS) < 5000, `expires_at = now + 24h (got ${ttl}ms)`);
  console.log('PASS: cache write stamps per-kind TTL and upserts on cache_key');

  // -- never-cache refusals -------------------------------------------------
  const before = calls.length;
  await qc.setCacheEntry('chat', 'k-empty1', '');
  await qc.setCacheEntry('chat', 'k-empty2', null);
  await qc.setCacheEntry('chat', 'k-empty3', []);
  await qc.setCacheEntry('chat', 'k-empty4', {});
  await qc.setCacheEntry('chat', 'k-secret', `answer with ${fakeKeyShape} inside`);
  assert.equal(calls.length, before, 'empty values and secret-shaped responses are never cached');
  console.log('PASS: errors/empties/secret shapes never cached (negative fixtures refused)');

  // -- read path: miss + expired -------------------------------------------
  nextGetRows = [];
  assert.equal(await qc.getCacheEntry('search', 'nope'), null, 'absent row = miss');
  const getCalls = calls.filter((c) => (!c.init.method || c.init.method === 'GET') && c.url.includes('/query_cache?'));
  assert.ok(getCalls.length > 0);
  assert.ok(getCalls[0].url.includes('expires_at=gt.'), 'reads filter expired rows out (TTL enforcement)');
  console.log('PASS: miss + TTL read filter (expired entries behave as misses)');

  // -- read path: hit with observability ------------------------------------
  nextGetRows = [{ cache_key: 'k', response_json: { value: searchCtx }, hit_count: 1, expires_at: new Date(Date.now() + 1000).toISOString() }];
  const hit = await qc.getCachedSearch({ userId: 'user_test1', provider: 'tavily', query: 'kenya domain', maxResults: 5, searchDepth: 'basic' });
  assert.ok(hit, 'valid stored context served from cache');
  assert.equal(hit.results.length, 1);
  await new Promise((r) => setTimeout(r, 10)); // let fire-and-forget log flush
  const patchCall = calls.find((c) => c.init.method === 'PATCH' && c.url.includes('/query_cache?'));
  assert.ok(patchCall, 'hit bumps hit_count');
  assert.equal(JSON.parse(patchCall.init.body).hit_count, 2, 'hit_count incremented');
  const logRow = calls.find((c) => c.url.includes('/rest/v1/model_call_log'));
  assert.ok(logRow, 'hit also writes a model_call_log observability row');
  assert.equal(JSON.parse(logRow.init.body).cache_hit, true, 'model_call_log row marked cache_hit');
  assert.equal(JSON.parse(logRow.init.body).mode, 'search');
  console.log('PASS: cache hit observable — hit_count bumped + model_call_log cache_hit row');

  // -- corrupted entry behaves like a miss -----------------------------------
  nextGetRows = [{ cache_key: 'k', response_json: { value: { bogus: true } }, hit_count: 0, expires_at: new Date(Date.now() + 1000).toISOString() }];
  assert.equal(await qc.getCachedSearch({ userId: 'user_test1', provider: 'tavily', query: 'kenya domain', maxResults: 5, searchDepth: 'basic' }), null, 'corrupted stored value = miss (fail closed)');
  console.log('PASS: corrupted cache entry degrades to a miss');

  // -- chat lane ------------------------------------------------------------
  nextGetRows = [{ cache_key: 'k', response_json: { value: 'cached completion' }, hit_count: 0, expires_at: new Date(Date.now() + 1000).toISOString() }];
  const chatHit = await qc.getCachedChat({ userId: 'user_test1', model: 'm', systemPrompt: 'sys', messages: msgs1, params: { temperature: 1 } });
  assert.equal(chatHit, 'cached completion', 'lane B chat replay returns stored text');
  await qc.setCachedChat({ userId: 'user_test1', model: 'm', systemPrompt: 'sys', messages: msgs1, params: { temperature: 1 }, text: '   ' });
  assert.equal(calls.filter((c) => c.init.method === 'POST' && c.url.includes('/query_cache')).length, 1, 'empty chat text never written');
  console.log('PASS: chat lane replays stored text; empty completions never cached');

  console.log('[query_cache_smoke] PASS: all query-cache assertions green.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
