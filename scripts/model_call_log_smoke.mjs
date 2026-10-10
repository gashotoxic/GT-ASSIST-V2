#!/usr/bin/env node
/* global process, console, Response */
/**
 * Smoke tests for services/modelCallLog.ts (tier1: modelCallsLogged).
 *
 * Bundles the service with esbuild, stubs fetch + the user context, and
 * asserts the persistence contract:
 *   - one POST per call with mode/model/prompt/latency/status/cache_hit
 *   - prompts are SECRET-SCRUBBED before persisting (the negative fixture
 *     carries a fake key shape assembled by concat so this file itself holds
 *     no scannable key shape)
 *   - prompts are truncated to 2000 chars
 *   - fire-and-forget: insert failure never throws
 *   - no user context → no insert
 *
 * Usage: node scripts/model_call_log_smoke.mjs
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'mcl-smoke-'));
const esbuildBin = join(root, 'node_modules', '.bin', 'esbuild');

if (!existsSync(esbuildBin)) {
  console.error('[model_call_log_smoke] FAIL: esbuild not found — run npm ci first.');
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
  `export * from ${JSON.stringify(join(root, 'services/modelCallLog.ts'))};\n` +
    `export { setAppUserContext, getAppUserContext } from ${JSON.stringify(join(root, 'services/userContext.ts'))};\n`
);

try {
  bundle(entryPath, 'modelCallLog.mjs');
  const mcl = await import('file://' + join(work, 'modelCallLog.mjs'));

  // Stub the Supabase REST endpoint.
  const calls = [];
  let failNext = false;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (failNext) {
      failNext = false;
      throw new Error('network down');
    }
    return new Response('', { status: 201 });
  };

  const fakeKeyShape = 'cpk_' + 'zK9mQ2wX7pL4nR8vT1yB';

  // -- no context → no insert ---------------------------------------------
  mcl.setAppUserContext(null);
  await mcl.logModelCall({ mode: 'chat', model: 'm', prompt: 'hi', latency_ms: 1, status: 'ok' });
  assert.equal(calls.length, 0, 'no user context → no insert');
  console.log('PASS: signed-out call is not logged (per-user table)');

  mcl.setAppUserContext({ userId: 'user_test1', accessToken: 'tok', supabaseUrl: 'https://sb.test', supabaseKey: 'anon' });

  // -- basic row shape -----------------------------------------------------
  await mcl.logModelCall({ mode: 'chat', model: 'deepseek-v4-flash', prompt: 'hello world', latency_ms: 42, status: 'ok', cache_hit: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://sb.test/rest/v1/model_call_log');
  const row = JSON.parse(calls[0].init.body);
  assert.equal(row.user_id, 'user_test1');
  assert.equal(row.mode, 'chat');
  assert.equal(row.model, 'deepseek-v4-flash');
  assert.equal(row.prompt, 'hello world');
  assert.equal(row.latency_ms, 42);
  assert.equal(row.status, 'ok');
  assert.equal(row.cache_hit, true);
  assert.equal(row.error, null);
  console.log('PASS: row carries user/mode/model/prompt/latency/status/cache_hit');

  // -- SECRET SCRUBBING (negative fixture) --------------------------------
  await mcl.logModelCall({ mode: 'chat', model: 'm', prompt: `my key is ${fakeKeyShape} ok?`, latency_ms: 5, status: 'ok' });
  const scrubRow = JSON.parse(calls[1].init.body);
  assert.ok(!scrubRow.prompt.includes(fakeKeyShape), 'key shape must be scrubbed from prompt');
  assert.ok(scrubRow.prompt.includes('[REDACTED]'), 'scrubbed span replaced with [REDACTED]');
  assert.ok(!/cpk_[A-Za-z0-9_]{8,}/.test(scrubRow.prompt), 'no key shape remains (regex check)');
  console.log('PASS: secret-shape prompt scrubbed to [REDACTED] before persist');

  // -- error rows + error sanitization ------------------------------------
  await mcl.logModelCall({ mode: 'image', model: 'qwen-image-2512', prompt: 'p', latency_ms: 9, status: 'error', error: `HTTP 500 at ${fakeKeyShape}` });
  const errRow = JSON.parse(calls[2].init.body);
  assert.equal(errRow.status, 'error');
  assert.ok(!errRow.error.includes(fakeKeyShape), 'error message scrubbed too');
  assert.ok(errRow.error.includes('[REDACTED]'));
  console.log('PASS: failure row logged with sanitized error');

  // -- truncation ----------------------------------------------------------
  await mcl.logModelCall({ mode: 'tts', model: 'audiodojo-speak', prompt: 'x'.repeat(10000), latency_ms: 3, status: 'ok' });
  const truncRow = JSON.parse(calls[3].init.body);
  assert.equal(truncRow.prompt.length, 2000, 'prompt truncated to 2000 chars');
  console.log('PASS: oversized prompt truncated to 2000 chars');

  // -- fire-and-forget on insert failure -----------------------------------
  failNext = true;
  await mcl.logModelCall({ mode: 'video', model: 'wan', prompt: 'p', latency_ms: 3, status: 'ok' });
  console.log('PASS: insert failure swallowed (never breaks the model call)');

  // -- fetch rejecting with non-ok status ----------------------------------
  globalThis.fetch = async () => new Response('', { status: 401 });
  await mcl.logModelCall({ mode: 'stt', model: 'whisper', prompt: '[audio]', latency_ms: 3, status: 'ok' });
  console.log('PASS: non-2xx insert does not throw');

  console.log('[model_call_log_smoke] PASS: all model-call-log assertions green.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
