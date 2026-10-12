/**
 * Tool output validation (tier1: toolOutputsValidated) — runtime schema
 * validation of every external "tool" output the platform consumes, per
 * spec §2. TypeScript types evaporate at runtime; these guards are the check
 * that actually runs.
 *
 * Tool families covered:
 *   1. Web search — raw Tavily / Brave JSON (via /api/search) → SearchResult[]
 *   2. Knowledge base retrieval — Supabase RPC rows → KnowledgeSearchRow[]
 *   3. Brand Studio tools — BrandStudioToolResult (discriminated union)
 *   (+ the Chutes embedding response consumed by knowledgeBase.ts)
 *
 * Contract: every validator returns a discriminated result
 *   { ok: true, value, dropped } | { ok: false, errors }
 * — no throwing, no silent coercion. Malformed ENTRIES are dropped and
 * counted; a malformed ENVELOPE fails the whole response (fail closed → the
 * caller treats it as a provider failure and degrades to a typed error).
 * Invalid output must never reach a model prompt or the UI.
 *
 * Hand-rolled type guards (repo style — no schema library in package.json).
 */

import type { SearchContext, SearchResult, SearchStrategy } from './searchAgent';
import type { SearchSource } from '../types';
import type { SearchResult as KnowledgeSearchRow } from './knowledgeBase';
import type { BrandStudioToolResult } from './brandStudioToolRuntime';

export type ValidationResult<T> =
  | { ok: true; value: T; dropped: number }
  | { ok: false; errors: string[] };

/** Join validator errors for an error message (no-throw helper). */
export function formatErrors(result: ValidationResult<unknown>): string {
  if (result.ok === false) return result.errors.join('; ');
  return '';
}

const SEARCH_STRATEGIES: SearchStrategy[] = ['quick', 'comprehensive', 'news', 'research'];

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

const isNonEmptyString = (x: unknown): x is string =>
  typeof x === 'string' && x.trim().length > 0;

const isString = (x: unknown): x is string => typeof x === 'string';

const isFiniteNumber = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x);

// ---------------------------------------------------------------------------
// 1. Web search providers
// ---------------------------------------------------------------------------

/**
 * Shared entry check for search results: `url` is required and must be a
 * non-empty string; `title` must be a string when present (missing title is
 * tolerated and defaulted, matching prior behavior); at least one of
 * content/snippet/description must be a present string.
 */
function normalizeSearchEntry(r: Record<string, unknown>): SearchResult | null {
  if (!isNonEmptyString(r.url)) return null;

  const contentSource =
    (isString(r.content) && r.content) ||
    (isString(r.raw_content) && r.raw_content) ||
    (isString(r.description) && r.description) ||
    '';
  const snippetSource = isString(r.snippet) ? r.snippet : contentSource;

  if (r.title !== undefined && !isString(r.title)) return null; // wrong type → drop
  if (!contentSource && !snippetSource) return null;             // no content at all → drop

  const result: SearchResult = {
    title: isString(r.title) && r.title.trim() ? r.title : 'Untitled',
    url: r.url,
    content: contentSource,
    snippet: snippetSource.slice(0, 200),
  };
  if (isString(r.published_date)) result.publishedDate = r.published_date;
  if (isString(r.publishedDate)) result.publishedDate = r.publishedDate;
  if (isFiniteNumber(r.score)) result.score = r.score;
  const profile = r.profile;
  if (isRecord(profile) && isString(profile.img)) result.favicon = profile.img;
  return result;
}

/** Validate a raw Tavily /search response → SearchResult[] (entries dropped + counted). */
export function validateTavilyResponse(raw: unknown): ValidationResult<SearchResult[]> {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['tavily: response is not an object'] };
  if (!Array.isArray(raw.results)) return { ok: false, errors: ['tavily: "results" is not an array'] };

  const value: SearchResult[] = [];
  let dropped = 0;
  raw.results.forEach((entry, i) => {
    if (!isRecord(entry)) {
      dropped += 1;
      errors.push(`tavily: results[${i}] is not an object`);
      return;
    }
    const parsed = normalizeSearchEntry(entry);
    if (parsed) value.push(parsed);
    else dropped += 1;
  });

  return { ok: true, value, dropped };
}

/** Validate a raw Brave /search response → SearchResult[] (entries dropped + counted). */
export function validateBraveResponse(raw: unknown): ValidationResult<SearchResult[]> {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['brave: response is not an object'] };
  const web = raw.web;
  // Brave may legitimately omit "web" on zero results — treat as empty, valid.
  if (web === undefined || web === null) return { ok: true, value: [], dropped: 0 };
  if (!isRecord(web) || !Array.isArray(web.results)) {
    return { ok: false, errors: ['brave: "web.results" is not an array'] };
  }

  const value: SearchResult[] = [];
  let dropped = 0;
  web.results.forEach((entry, i) => {
    if (!isRecord(entry)) {
      dropped += 1;
      errors.push(`brave: web.results[${i}] is not an object`);
      return;
    }
    const parsed = normalizeSearchEntry(entry);
    if (parsed) value.push(parsed);
    else dropped += 1;
  });

  return { ok: true, value, dropped };
}

// ---------------------------------------------------------------------------
// 1b. SearchContext (e.g. cached contexts read back from query_cache)
// ---------------------------------------------------------------------------

function isSearchSource(x: unknown): x is SearchSource {
  if (!isRecord(x)) return false;
  return isFiniteNumber(x.index) && isString(x.title) && isNonEmptyString(x.url) && isString(x.domain);
}

/** Validate a full SearchContext shape (including `sources`). Fail closed. */
export function validateSearchContext(raw: unknown): ValidationResult<SearchContext> {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['searchContext: not an object'] };
  if (!isString(raw.query)) errors.push('searchContext: query must be a string');
  if (!isString(raw.originalQuery)) errors.push('searchContext: originalQuery must be a string');
  if (!isNonEmptyString(raw.strategy) || !SEARCH_STRATEGIES.includes(raw.strategy as SearchStrategy)) {
    errors.push('searchContext: strategy must be quick|comprehensive|news|research');
  }
  if (!Array.isArray(raw.results)) errors.push('searchContext: results must be an array');
  if (!isString(raw.synthesizedContext)) errors.push('searchContext: synthesizedContext must be a string');
  if (!isFiniteNumber(raw.searchTime)) errors.push('searchContext: searchTime must be a number');
  if (raw.error !== undefined && !isString(raw.error)) errors.push('searchContext: error must be a string when present');

  let dropped = 0;
  const results: SearchResult[] = [];
  if (Array.isArray(raw.results)) {
    raw.results.forEach((entry, i) => {
      const parsed = isRecord(entry) ? normalizeSearchEntry(entry) : null;
      if (parsed) results.push(parsed);
      else {
        dropped += 1;
        errors.push(`searchContext: results[${i}] malformed`);
      }
    });
  }

  const sources: SearchSource[] = [];
  if (raw.sources !== undefined) {
    if (!Array.isArray(raw.sources)) {
      errors.push('searchContext: sources must be an array');
    } else {
      raw.sources.forEach((s, i) => {
        if (isSearchSource(s)) sources.push(s);
        else {
          dropped += 1;
          errors.push(`searchContext: sources[${i}] malformed`);
        }
      });
    }
  }

  if (errors.some((e) => !e.includes('malformed'))) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    dropped,
    value: {
      query: raw.query as string,
      originalQuery: raw.originalQuery as string,
      strategy: raw.strategy as SearchStrategy,
      results,
      synthesizedContext: raw.synthesizedContext as string,
      sources,
      searchTime: raw.searchTime as number,
      error: (raw.error as string | undefined) ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Knowledge base retrieval rows
// ---------------------------------------------------------------------------

/** Validate Supabase `search_knowledge` RPC rows (malformed rows dropped + counted). */
export function validateKnowledgeResults(raw: unknown): ValidationResult<KnowledgeSearchRow[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ['knowledge: response is not an array'] };
  }

  const value: KnowledgeSearchRow[] = [];
  let dropped = 0;
  raw.forEach((entry) => {
    if (!isRecord(entry)) {
      dropped += 1;
      return;
    }
    if (
      isString(entry.id) &&
      isString(entry.document_id) &&
      isString(entry.filename) &&
      isString(entry.content) &&
      isFiniteNumber(entry.chunk_index) &&
      isFiniteNumber(entry.similarity)
    ) {
      value.push({
        id: entry.id,
        document_id: entry.document_id,
        filename: entry.filename,
        content: entry.content,
        chunk_index: entry.chunk_index,
        similarity: entry.similarity,
      });
    } else {
      dropped += 1;
    }
  });

  return { ok: true, value, dropped };
}

// ---------------------------------------------------------------------------
// 2b. Embedding response (Chutes /v1/embeddings)
// ---------------------------------------------------------------------------

/** Validate an embeddings API response → number[][] (fail closed). */
export function validateEmbeddingResponse(raw: unknown): ValidationResult<number[][]> {
  if (!isRecord(raw)) return { ok: false, errors: ['embedding: response is not an object'] };
  if (!Array.isArray(raw.data)) return { ok: false, errors: ['embedding: "data" is not an array'] };

  const value: number[][] = [];
  raw.data.forEach((entry, i) => {
    if (!isRecord(entry) || !Array.isArray(entry.embedding) || !entry.embedding.every(isFiniteNumber)) {
      return;
    }
    value.push(entry.embedding as number[]);
  });

  if (value.length !== raw.data.length) {
    return { ok: false, errors: ['embedding: one or more embeddings missing or malformed'] };
  }
  return { ok: true, value, dropped: 0 };
}

// ---------------------------------------------------------------------------
// 3. Brand Studio tool results
// ---------------------------------------------------------------------------

/** Validate a constructed BrandStudioToolResult (discriminate on `type`). Fail closed. */
export function validateToolResult(raw: unknown): ValidationResult<BrandStudioToolResult> {
  if (!isRecord(raw)) return { ok: false, errors: ['toolResult: not an object'] };

  if (raw.type === 'image') {
    const errors: string[] = [];
    if (!isNonEmptyString(raw.url)) errors.push('toolResult.image: url must be a non-empty string');
    if (!isNonEmptyString(raw.mediaItemId)) errors.push('toolResult.image: mediaItemId must be a non-empty string');
    if (!isString(raw.prompt)) errors.push('toolResult.image: prompt must be a string');
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      dropped: 0,
      value: {
        type: 'image',
        url: raw.url as string,
        mediaItemId: raw.mediaItemId as string,
        prompt: raw.prompt as string,
      },
    };
  }

  if (raw.type === 'error') {
    if (!isString(raw.message)) return { ok: false, errors: ['toolResult.error: message must be a string'] };
    return { ok: true, dropped: 0, value: { type: 'error', message: raw.message } };
  }

  return { ok: false, errors: [`toolResult: unknown type "${String(raw.type)}"`] };
}
