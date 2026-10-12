-- =====================================================
-- QUERY CACHE MIGRATION (tier1: repeatQueriesCached)
-- =====================================================
-- Repeat-query cache: an identical repeated query within TTL is served from
-- this table instead of re-invoking the upstream provider (spec §3).
--
-- PRIVACY (hard requirement): cache_key is a sha256 over
-- (user identity + kind + model + normalized query + serialized params),
-- computed by services/queryCache.ts. One user's cached chat completion can
-- therefore NEVER be served to another user — even before RLS. RLS doubles the
-- barrier: each user only ever sees/updates their own rows. A future shared
-- cache is only allowed for non-personal tool outputs (kind in
-- 'search'/'knowledge'), never for 'chat'.
--
-- TTLs (services/queryCache.ts): search 24h, chat 1h, knowledge 24h. Reads
-- filter expires_at > now(); expired rows are inert until pruned. Pruning
-- (service role, delete where expires_at < now()) is a follow-up job.
--
-- hit_count is the observability proof (spec §3b): every cache hit bumps it
-- AND writes a model_call_log row with cache_hit = true. A cache nobody can
-- observe is not a cache a verifier can verify.
--
-- Never cached (enforced in services/queryCache.ts): errors, empty results,
-- and any response containing a secret shape (lib/secretPatterns.mjs).

CREATE TABLE IF NOT EXISTS query_cache (
  cache_key     TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('chat', 'search', 'knowledge')),
  response_json JSONB NOT NULL,
  hit_count     INTEGER NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_query_cache_user_expires
  ON query_cache (user_id, expires_at);

ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS query_cache_self_all ON query_cache;

CREATE POLICY query_cache_self_all
  ON query_cache
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());
