-- =====================================================
-- MODEL CALL LOG MIGRATION (tier1: modelCallsLogged)
-- =====================================================
-- Per-model-call log: one row per provider call made through the
-- services/chutes.ts proxyFetch / generateVideo boundary (all eight
-- ChutesService methods), plus cache-served replays (cache_hit = true).
--
-- The credit ledger does NOT cover this: it logs billed actions, not calls —
-- a failed call, a retry, or a zero-credit action is invisible to it.
--
-- Column notes:
--   * user_id is TEXT, not uuid: this app authenticates with Clerk and every
--     table stores Clerk user ids as TEXT (see week3_new_database_schema.sql).
--     The spec's uuid/auth.uid() sketch predates that convention.
--   * prompt is SECRET-SCRUBBED (lib/secretPatterns.mjs, same regexes as
--     scripts/scan-dist-secrets.mjs) and truncated to 2000 chars BEFORE insert
--     by services/modelCallLog.ts. Binary inputs (audio/video/image payloads)
--     are never persisted — only the text instruction or a placeholder.
--   * latency_ms is time-to-first-byte for every mode (measured around the
--     proxy fetch, including internal 429/503 retries). For streaming chat
--     this is TTFT; documented choice per spec §1b.
--   * cache_hit marks rows written by the repeat-query cache (spec §3b) —
--     the observability proof that a request was served without a provider call.
--   * mode 'search' / 'knowledge_search' rows are cache-observability rows for
--     the tool-query cache lane (spec §3 lane A).
--
-- RLS: users read ONLY their own rows and can only insert rows under their own
-- id. Append-only — no UPDATE/DELETE policy for users. Operator access (if
-- ever needed) goes through the service role, not a weakened policy.
--
-- Retention: rows are user data (scrubbed prompts). A pruning job (service
-- role, e.g. delete rows older than 90 days) is a follow-up; nothing here
-- grants public access.

CREATE TABLE IF NOT EXISTS model_call_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  mode          TEXT NOT NULL CHECK (mode IN (
                  'chat', 'prompt_enhance', 'image', 'image_edit', 'video',
                  'lip_sync', 'tts', 'stt', 'embedding',
                  'search', 'knowledge_search'
                )),
  model         TEXT NOT NULL,
  prompt        TEXT NOT NULL,          -- scrubbed + truncated, see header
  latency_ms    INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  error         TEXT,                   -- short sanitized message when status='error'
  cache_hit     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_model_call_log_user_created
  ON model_call_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_call_log_user_mode
  ON model_call_log (user_id, mode, created_at DESC);

ALTER TABLE model_call_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS model_call_log_self_select ON model_call_log;
DROP POLICY IF EXISTS model_call_log_self_insert ON model_call_log;

CREATE POLICY model_call_log_self_select
  ON model_call_log
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_sub());

CREATE POLICY model_call_log_self_insert
  ON model_call_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = requesting_sub());
