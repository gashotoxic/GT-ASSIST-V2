/**
 * Model call log (tier1: modelCallsLogged) — per-model-call log with
 * prompt / model / latency, per spec §1.
 *
 * Every provider call made through services/chutes.ts lands here (one row per
 * call, successes and failures alike), plus cache-served replays with
 * cache_hit = true (spec §3b observability). The credit ledger is NOT this:
 * it logs billed actions, not calls.
 *
 * Contract:
 *  - Fire-and-forget. logModelCall NEVER rejects and NEVER throws — a logging
 *    failure must never break the actual model call.
 *  - The prompt is secret-scrubbed + truncated BEFORE persisting
 *    (lib/secretPatterns.mjs — same regexes as scripts/scan-dist-secrets.mjs).
 *    Logging must not become the leak path secretsStripped exists to prevent.
 *  - Binary inputs (audio/video/image payloads) are never persisted; callers
 *    pass a text instruction or a short placeholder instead.
 *  - Insert path: client-side Supabase REST with the user's own session token
 *    (RLS insert policy: user_id = requesting_sub()). Server-side logging in
 *    api/chutes.ts (which would also see BYOK calls) is the documented
 *    hardening follow-up.
 *  - Signed-out calls are not logged: the table is per-user (RLS) and there is
 *    no user to attach the row to.
 */

import { sanitizePersistedText } from '../lib/secretPatterns.mjs';
import { getAppUserContext } from './userContext';

export type ModelCallMode =
  | 'chat'
  | 'prompt_enhance'
  | 'image'
  | 'image_edit'
  | 'video'
  | 'lip_sync'
  | 'tts'
  | 'stt'
  | 'embedding'
  | 'search'
  | 'knowledge_search';

/** The row shape persisted to Supabase `model_call_log` (minus server columns). */
export type ModelCallLogEntry = {
  mode: ModelCallMode;
  /** Provider model id, e.g. 'deepseek-v4-flash', 'qwen-image-2512'. */
  model: string;
  /** Raw prompt text; scrubbed + truncated before insert. */
  prompt: string;
  /** Time-to-first-byte in ms for every mode (documented in the migration). */
  latency_ms: number;
  status: 'ok' | 'error';
  /** Short sanitized message when status = 'error'. */
  error?: string | null;
  /** True for cache-served replays (no upstream provider call happened). */
  cache_hit?: boolean;
};

const ERROR_MAX_CHARS = 300;

/** Sanitize a short error message the same way prompts are sanitized. */
export function sanitizeErrorMessage(message: string): string {
  const scrubbed = sanitizePersistedText(message);
  return scrubbed.length > ERROR_MAX_CHARS ? scrubbed.slice(0, ERROR_MAX_CHARS) : scrubbed;
}

/**
 * Persist one model-call row. Fire-and-forget: the returned promise resolves
 * even when the insert fails (logged to console, never thrown).
 */
export async function logModelCall(entry: ModelCallLogEntry): Promise<void> {
  try {
    const ctx = getAppUserContext();
    if (!ctx || !ctx.userId || !ctx.accessToken || !ctx.supabaseUrl || !ctx.supabaseKey) {
      return; // signed out (or Supabase not configured) — nothing to attach
    }

    const row = {
      user_id: ctx.userId,
      mode: entry.mode,
      model: String(entry.model || 'unknown').slice(0, 200),
      prompt: sanitizePersistedText(entry.prompt),
      latency_ms: Math.max(0, Math.round(entry.latency_ms)),
      status: entry.status,
      error: entry.error ? sanitizeErrorMessage(entry.error) : null,
      cache_hit: Boolean(entry.cache_hit),
    };

    const res = await fetch(`${ctx.supabaseUrl}/rest/v1/model_call_log`, {
      method: 'POST',
      headers: {
        'apikey': ctx.supabaseKey,
        'Authorization': `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      // Status only — never the payload.
      console.warn('[modelCallLog] insert rejected:', res.status);
    }
  } catch (err) {
    // Never surface prompt content here — only the failure class.
    console.warn('[modelCallLog] insert failed:', err instanceof Error ? err.name : 'unknown');
  }
}
