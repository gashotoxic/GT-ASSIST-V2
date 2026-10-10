#!/usr/bin/env node
/* global process, console, Response */
/**
 * Smoke tests for services/toolOutputValidation.ts (tier1: toolOutputsValidated).
 *
 * Per tool type: one POSITIVE fixture (accepted) and at least one NEGATIVE
 * fixture (missing field / wrong type / junk JSON / empty) asserted REJECTED.
 * The negative fixtures are what make this demonstration non-vacuous:
 * schema validation that has never rejected anything is indistinguishable
 * from no validation.
 *
 * Also a wiring-level fail-closed demo: a SearchAgent fed malformed upstream
 * responses for BOTH providers must surface a typed error, never content.
 *
 * Usage: node scripts/tool_validation_smoke.mjs
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'toolval-smoke-'));
const esbuildBin = join(root, 'node_modules', '.bin', 'esbuild');

if (!existsSync(esbuildBin)) {
  console.error('[tool_validation_smoke] FAIL: esbuild not found — run npm ci first.');
  process.exit(1);
}

const bundle = (entry, out) =>
  execFileSync(esbuildBin, [entry, '--bundle', '--format=esm', '--platform=node', '--outfile=' + join(work, out)], {
    cwd: root,
    stdio: 'pipe',
  });

try {
  bundle('services/toolOutputValidation.ts', 'validators.mjs');
  bundle('services/searchAgent.ts', 'searchAgent.mjs');
  const v = await import('file://' + join(work, 'validators.mjs'));

  // ---- Tavily ----
  const tavilyPos = {
    results: [
      { title: 'Kenya news', url: 'https://example.com/a', content: 'full text', score: 0.9 },
      { title: 'Other', url: 'https://example.com/b', raw_content: 'raw text', published_date: '2026-10-01' },
    ],
  };
  const tPos = v.validateTavilyResponse(tavilyPos);
  assert.ok(tPos.ok, 'positive tavily fixture accepted');
  assert.equal(tPos.value.length, 2);
  assert.equal(tPos.value[0].content, 'full text');
  assert.equal(tPos.value[1].publishedDate, '2026-10-01');
  console.log('PASS tavily: positive fixture accepted with normalized fields');

  assert.equal(v.validateTavilyResponse('junk').ok, false, 'junk JSON rejected');
  assert.equal(v.validateTavilyResponse({ results: 'not-an-array' }).ok, false, 'non-array results rejected');
  assert.equal(v.validateTavilyResponse({}).ok, false, 'missing results rejected');
  const tMixed = v.validateTavilyResponse({
    results: [
      { title: 'ok', url: 'https://e.com', content: 'c' },
      { title: 'no url', content: 'c' },            // missing field → dropped
      { title: 123, url: 'https://e.com', content: 'c' }, // wrong type → dropped
      { title: 'no content at all', url: 'https://e.com' }, // no content → dropped
      null,                                          // junk entry → dropped
    ],
  });
  assert.ok(tMixed.ok, 'envelope ok with partial drops');
  assert.equal(tMixed.value.length, 1, 'only the valid entry survives');
  assert.equal(tMixed.dropped, 4, 'four malformed entries dropped and counted');
  console.log('PASS tavily: negative fixtures rejected/dropped with count');

  // ---- Brave ----
  const bravePos = { web: { results: [{ title: 't', url: 'https://e.com', description: 'd', profile: { img: 'https://e.com/i.png' } }] } };
  const bPos = v.validateBraveResponse(bravePos);
  assert.ok(bPos.ok && bPos.value.length === 1 && bPos.value[0].content === 'd');
  assert.ok(v.validateBraveResponse({}).ok, 'brave with no web = empty valid');
  assert.equal(v.validateBraveResponse({ web: { results: 7 } }).ok, false, 'web.results non-array rejected');
  assert.equal(v.validateBraveResponse(42).ok, false, 'junk JSON rejected');
  const bMixed = v.validateBraveResponse({ web: { results: [{ title: 't', url: 'https://e.com', description: 'd' }, { title: 'x', url: '' }] } });
  assert.equal(bMixed.value.length, 1, 'brave: empty-url entry dropped');
  assert.equal(bMixed.dropped, 1);
  console.log('PASS brave: positive accepted, negative fixtures rejected/dropped');

  // ---- SearchContext ----
  const ctxPos = {
    query: 'q', originalQuery: 'Q', strategy: 'quick',
    results: [{ title: 't', url: 'https://e.com', content: 'c', snippet: 'c' }],
    synthesizedContext: 'text', sources: [{ index: 1, title: 't', url: 'https://e.com', domain: 'e.com' }],
    searchTime: 12,
  };
  assert.ok(v.validateSearchContext(ctxPos).ok, 'positive SearchContext accepted');
  assert.equal(v.validateSearchContext({ ...ctxPos, strategy: 'bogus' }).ok, false, 'bad strategy rejected');
  assert.equal(v.validateSearchContext({ ...ctxPos, sources: 'x' }).ok, false, 'non-array sources rejected');
  assert.equal(v.validateSearchContext({}).ok, false, 'empty object rejected');
  assert.equal(v.validateSearchContext(null).ok, false, 'null rejected');
  console.log('PASS searchContext: full-shape positive accepted, malformed rejected');

  // ---- Knowledge rows ----
  const kbRow = { id: 'k1', document_id: 'd1', filename: 'f.txt', content: 'chunk', chunk_index: 0, similarity: 0.83 };
  assert.ok(v.validateKnowledgeResults([kbRow]).ok, 'positive knowledge row accepted');
  const kbMixed = v.validateKnowledgeResults([kbRow, { ...kbRow, similarity: 'high' }, { nope: 1 }, 'junk']);
  assert.ok(kbMixed.ok);
  assert.equal(kbMixed.value.length, 1);
  assert.equal(kbMixed.dropped, 3, 'three malformed rows dropped and counted');
  assert.equal(v.validateKnowledgeResults({ rows: [] }).ok, false, 'non-array rejected');
  console.log('PASS knowledge: positive accepted, malformed rows dropped with count');

  // ---- Embeddings ----
  const embPos = { data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3] }] };
  assert.ok(v.validateEmbeddingResponse(embPos).ok && v.validateEmbeddingResponse(embPos).value.length === 2);
  assert.equal(v.validateEmbeddingResponse({ data: [{ embedding: ['x'] }] }).ok, false, 'string embedding rejected');
  assert.equal(v.validateEmbeddingResponse({ data: 'nope' }).ok, false, 'non-array data rejected');
  assert.equal(v.validateEmbeddingResponse({}).ok, false, 'missing data rejected');
  console.log('PASS embedding: positive accepted, malformed rejected');

  // ---- Brand Studio tool results ----
  assert.ok(v.validateToolResult({ type: 'image', url: 'blob:x', mediaItemId: 'id1', prompt: 'p' }).ok);
  assert.ok(v.validateToolResult({ type: 'error', message: 'boom' }).ok);
  assert.equal(v.validateToolResult({ type: 'image', url: '', mediaItemId: 'id1', prompt: 'p' }).ok, false, 'empty url rejected');
  assert.equal(v.validateToolResult({ type: 'image', url: 'u', mediaItemId: 'id1' }).ok, false, 'missing prompt rejected');
  assert.equal(v.validateToolResult({ type: 'wat' }).ok, false, 'unknown discriminant rejected');
  assert.equal(v.validateToolResult('junk').ok, false, 'junk rejected');
  console.log('PASS toolResult: union positives accepted, malformed/unknown rejected');

  // ---- Wiring-level fail-closed demo (SearchAgent, both providers bad) ----
  const { SearchAgent } = await import('file://' + join(work, 'searchAgent.mjs'));
  // Malformed for BOTH validators (tavily: results non-array; brave: web.results non-array).
  globalThis.fetch = async () => new Response(JSON.stringify({ results: 'CORRUPTED-NOT-AN-ARRAY', web: { results: 7 } }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  const agent = new SearchAgent({ preferredProvider: 'tavily', tavilyApiKey: 'tvly-' + 'x'.repeat(12) });
  const ctx = await agent.search('kenya domain registry');
  assert.ok(ctx.error, 'malformed upstream must surface as a typed error');
  assert.equal(ctx.results.length, 0, 'no malformed content reaches the model');
  assert.equal(ctx.synthesizedContext, '', 'no synthesized context from invalid output');
  console.log('PASS fail-closed: malformed provider output never reaches the model/prompt');

  console.log('[tool_validation_smoke] PASS: all tool-output-validation assertions green.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
