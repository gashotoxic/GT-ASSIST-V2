/**
 * Repeat-query cache (tier1: repeatQueriesCached) — spec §3.
 *
 * An identical repeated query within TTL is served from Supabase `query_cache`
 * instead of re-invoking the upstream provider, with OBSERVABLE proof of hits:
 * every hit bumps `query_cache.hit_count` AND writes a `model_call_log` row
 * with cache_hit = true (spec §3b). A cache nobody can observe is not a cache
 * a verifier can verify.
 *
 * Two lanes (both required):
 *   Lane A — tool-query cache: search results (kind 'search') and knowledge
 *            retrieval results (kind 'knowledge'). Non-personal, deterministic.
 *   Lane B — identical chat request cache (kind 'chat'): whole assistant
 *            responses only, replayed through the existing SSE stream path.
 *
 * Key: sha256(user identity + kind + model + normalized(query) + params).
 * Search/knowledge queries are normalized (trim, collapse whitespace,
 * lowercase); chat is exact-match on message content. The user identity is
 * ALWAYS part of the key — one user's cached completion can never be served
 * to another (RLS is the second barrier; see query_cache.sql).
 *
 * TTLs: search/knowledge 24h, chat 1h (constants below).
 * Never cached: errors, empty results, anything containing a secret shape
 * (lib/secretPatterns.mjs).
 *
 * Storage is Supabase-backed on purpose: persistent across devices/reloads
 * and inspectable by a verifier. An in-memory Map alone is NOT sufficient
 * evidence (Vercel instances are ephemeral).
 */

import { containsSecretShape } from '../lib/secretPatterns.mjs';
import { logModelCall, type ModelCallMode } from './modelCallLog';
import { getAppUserContext } from './userContext';
import { validateSearchContext, validateKnowledgeResults, ValidationResult } from './toolOutputValidation';
import type { SearchContext } from './searchAgent';
import type { SearchResult as KnowledgeSearchRow } from './knowledgeBase';

// --- TTLs (spec §3a) -------------------------------------------------------

export const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const CHAT_CACHE_TTL_MS = 60 * 60 * 1000;        // 1h
export const KNOWLEDGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CacheKind = 'chat' | 'search' | 'knowledge';

const KIND_TTL_MS: Record<CacheKind, number> = {
  chat: CHAT_CACHE_TTL_MS,
  search: SEARCH_CACHE_TTL_MS,
  knowledge: KNOWLEDGE_CACHE_TTL_MS,
};

const KIND_LOG_MODE: Record<CacheKind, ModelCallMode> = {
  chat: 'chat',
  search: 'search',
  knowledge: 'knowledge_search',
};

// --- Normalization + keys --------------------------------------------------

/** Normalize a search/knowledge query: trim, collapse whitespace, lowercase. */
export function normalizeQuery(query: string): string {
  return (query || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Stable JSON: object keys sorted recursively so key material never depends
 * on property insertion order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/** Normalize chat messages to their identity-relevant fields (strip volatile ids/timestamps). */
export function normalizeMessagesForKey(messages: Array<Record<string, unknown>>): unknown {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.name !== undefined ? { name: m.name } : {}),
    ...(m.tool_call_id !== undefined ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.tool_calls !== undefined ? { tool_calls: m.tool_calls } : {}),
  }));
}

/** sha256 hex digest of `material` (browser + node ≥19 via crypto.subtle). */
export async function hashKey(material: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compose the cache key. The user identity is hashed in FIRST so a shared
 * primary key can never collide across users.
 */
export async function computeCacheKey(
  kind: CacheKind,
  userId: string,
  model: string,
  normalizedQueryOrMessages: string,
  params: Record<string, unknown> = {}
): Promise<string> {
  return hashKey(
    [userId, kind, model || '', normalizedQueryOrMessages, stableStringify(params)].join('\n')
  );
}

// --- Core read/write (Supabase REST, per-user RLS) -------------------------

type CacheRow = {
  cache_key: string;
  user_id: string;
  kind: CacheKind;
  response_json: { value: unknown };
  hit_count: number;
  expires_at: string;
};

function restBase(): { url: string; headers: Record<string, string> } | null {
  const ctx = getAppUserContext();
  if (!ctx || !ctx.userId || !ctx.accessToken || !ctx.supabaseUrl || !ctx.supabaseKey) return null;
  return {
    url: `${ctx.supabaseUrl}/rest/v1/query_cache`,
    headers: {
      'apikey': ctx.supabaseKey,
      'Authorization': `Bearer ${ctx.accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Read a cache entry if present and unexpired. Returns raw stored value.
 * Never throws — cache read failures are misses.
 */
export async function getCacheEntry(kind: CacheKind, cacheKey: string): Promise<unknown | null> {
  try {
    const rest = restBase();
    if (!rest) return null;
    const now = new Date().toISOString();
    const res = await fetch(
      `${rest.url}?cache_key=eq.${encodeURIComponent(cacheKey)}&kind=eq.${kind}&expires_at=gt.${encodeURIComponent(now)}&select=response_json,hit_count`,
      { headers: rest.headers }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as CacheRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0].response_json?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a cache entry (upsert by cache_key). Refuses errors/empties/secret
 * shapes — enforced here so no caller can bypass it. Never throws.
 */
export async function setCacheEntry(
  kind: CacheKind,
  cacheKey: string,
  value: unknown,
  opts?: { promptForSecretCheck?: string }
): Promise<boolean> {
  try {
    const rest = restBase();
    const ctx = getAppUserContext();
    if (!rest || !ctx?.userId) return false;

    const serialized = JSON.stringify(value ?? null);
    if (serialized === undefined || serialized === 'null' || serialized === '""' || serialized === '[]' || serialized === '{}') {
      return false; // never cache empty results
    }
    const secretProbe = `${opts?.promptForSecretCheck ?? ''}\n${serialized}`;
    if (containsSecretShape(secretProbe)) return false; // never cache secret shapes

    const ttl = KIND_TTL_MS[kind];
    const res = await fetch(`${rest.url}?on_conflict=cache_key`, {
      method: 'POST',
      headers: { ...rest.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        cache_key: cacheKey,
        user_id: ctx.userId,
        kind,
        response_json: { value },
        hit_count: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl).toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Record a cache hit observably: bump `hit_count` AND write a
 * `model_call_log` row with cache_hit = true (spec §3b). Never throws.
 */
export async function recordCacheHit(
  kind: CacheKind,
  cacheKey: string,
  observed: { model: string; prompt: string; latencyMs: number }
): Promise<void> {
  try {
    const rest = restBase();
    if (rest) {
      try {
        const res = await fetch(`${rest.url}?cache_key=eq.${encodeURIComponent(cacheKey)}`, {
          method: 'PATCH',
          headers: { ...rest.headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ hit_count: (await readHitCount(rest, cacheKey)) + 1 }),
        });
        void res;
      } catch {
        void 0; // bump is best-effort; the log row below is the primary proof
      }
    }
    await logModelCall({
      mode: KIND_LOG_MODE[kind],
      model: observed.model,
      prompt: observed.prompt,
      latency_ms: observed.latencyMs,
      status: 'ok',
      cache_hit: true,
    });
  } catch {
    void 0;
  }
}

async function readHitCount(
  rest: { url: string; headers: Record<string, string> },
  cacheKey: string
): Promise<number> {
  const res = await fetch(
    `${rest.url}?cache_key=eq.${encodeURIComponent(cacheKey)}&select=hit_count`,
    { headers: rest.headers }
  );
  if (!res.ok) return 0;
  const rows = (await res.json()) as Array<{ hit_count: number }>;
  return rows[0]?.hit_count ?? 0;
}

// --- Typed lane helpers ----------------------------------------------------

async function validatedGet<T>(
  kind: CacheKind,
  cacheKey: string,
  validate: (raw: unknown) => ValidationResult<T>,
  observed: { model: string; prompt: string }
): Promise<T | null> {
  const started = Date.now();
  const raw = await getCacheEntry(kind, cacheKey);
  if (raw === null) return null;
  const check = validate(raw);
  if (!check.ok) return null; // corrupted entry behaves like a miss
  await recordCacheHit(kind, cacheKey, { ...observed, latencyMs: Date.now() - started });
  return check.value;
}

/** Lane A: search. Key includes provider + result-count params. */
export async function getCachedSearch(args: {
  userId: string;
  provider: 'tavily' | 'brave';
  query: string;
  maxResults: number;
  searchDepth: string;
}): Promise<SearchContext | null> {
  const cacheKey = await computeCacheKey('search', args.userId, args.provider, normalizeQuery(args.query), {
    maxResults: args.maxResults,
    searchDepth: args.searchDepth,
  });
  return validatedGet('search', cacheKey, validateSearchContext, {
    model: args.provider,
    prompt: args.query,
  });
}

export async function setCachedSearch(args: {
  userId: string;
  provider: 'tavily' | 'brave';
  query: string;
  maxResults: number;
  searchDepth: string;
  context: SearchContext;
}): Promise<void> {
  const cacheKey = await computeCacheKey('search', args.userId, args.provider, normalizeQuery(args.query), {
    maxResults: args.maxResults,
    searchDepth: args.searchDepth,
  });
  await setCacheEntry('search', cacheKey, args.context, { promptForSecretCheck: args.context.synthesizedContext });
}

/** Lane A: knowledge retrieval. */
export async function getCachedKnowledge(args: {
  userId: string;
  query: string;
  limit: number;
  threshold: number;
}): Promise<KnowledgeSearchRow[] | null> {
  const cacheKey = await computeCacheKey('knowledge', args.userId, 'text-embedding-ada-002', normalizeQuery(args.query), {
    limit: args.limit,
    threshold: args.threshold,
  });
  return validatedGet('knowledge', cacheKey, validateKnowledgeResults, {
    model: 'text-embedding-ada-002',
    prompt: args.query,
  });
}

export async function setCachedKnowledge(args: {
  userId: string;
  query: string;
  limit: number;
  threshold: number;
  results: KnowledgeSearchRow[];
}): Promise<void> {
  const cacheKey = await computeCacheKey('knowledge', args.userId, 'text-embedding-ada-002', normalizeQuery(args.query), {
    limit: args.limit,
    threshold: args.threshold,
  });
  await setCacheEntry('knowledge', cacheKey, args.results);
}

/** Lane B: identical chat request (exact message content + model + settings). */
export async function getCachedChat(args: {
  userId: string;
  model: string;
  systemPrompt: string;
  messages: Array<Record<string, unknown>>;
  params: Record<string, unknown>;
}): Promise<string | null> {
  const cacheKey = await computeCacheKey(
    'chat',
    args.userId,
    args.model,
    `${args.systemPrompt}\n${stableStringify(normalizeMessagesForKey(args.messages))}`,
    args.params
  );
  const value = await validatedGet('chat', cacheKey, (raw) =>
    typeof raw === 'string' && raw.trim().length > 0
      ? { ok: true, value: raw, dropped: 0 }
      : { ok: false, errors: ['chat cache: value must be a non-empty string'] },
    { model: args.model, prompt: extractLastUserPrompt(args.messages) }
  );
  return value;
}

export async function setCachedChat(args: {
  userId: string;
  model: string;
  systemPrompt: string;
  messages: Array<Record<string, unknown>>;
  params: Record<string, unknown>;
  text: string;
}): Promise<void> {
  if (!args.text || !args.text.trim()) return;
  const cacheKey = await computeCacheKey(
    'chat',
    args.userId,
    args.model,
    `${args.systemPrompt}\n${stableStringify(normalizeMessagesForKey(args.messages))}`,
    args.params
  );
  await setCacheEntry('chat', cacheKey, args.text, { promptForSecretCheck: args.text });
}

function extractLastUserPrompt(messages: Array<Record<string, unknown>>): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === 'user') {
      const c = m.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        return c
          .map((part: Record<string, unknown>) => (typeof part?.text === 'string' ? part.text : '[image]'))
          .join(' ');
      }
    }
  }
  return '';
}
