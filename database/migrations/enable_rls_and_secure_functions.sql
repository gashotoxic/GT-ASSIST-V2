CREATE OR REPLACE FUNCTION requesting_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'role')::text;
$$;

CREATE OR REPLACE FUNCTION requesting_sub()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::text;
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_select ON users;
DROP POLICY IF EXISTS users_self_insert ON users;
DROP POLICY IF EXISTS users_self_update ON users;

CREATE POLICY users_self_select
  ON users
  FOR SELECT
  TO authenticated
  USING (id = requesting_sub());

CREATE POLICY users_self_insert
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = requesting_sub());

CREATE POLICY users_self_update
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = requesting_sub())
  WITH CHECK (id = requesting_sub());

DROP POLICY IF EXISTS chat_sessions_self_all ON chat_sessions;
CREATE POLICY chat_sessions_self_all
  ON chat_sessions
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

DROP POLICY IF EXISTS messages_self_all ON messages;
CREATE POLICY messages_self_all
  ON messages
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

DROP POLICY IF EXISTS media_history_self_all ON media_history;
CREATE POLICY media_history_self_all
  ON media_history
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

DROP POLICY IF EXISTS credits_log_self_select ON credits_log;
CREATE POLICY credits_log_self_select
  ON credits_log
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_sub());

DROP POLICY IF EXISTS subscriptions_self_select ON subscriptions;
CREATE POLICY subscriptions_self_select
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_sub());

DROP POLICY IF EXISTS user_api_keys_self_all ON user_api_keys;
CREATE POLICY user_api_keys_self_all
  ON user_api_keys
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

DROP POLICY IF EXISTS knowledge_documents_self_all ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_chunks_self_all ON knowledge_chunks;

CREATE POLICY knowledge_documents_self_all
  ON knowledge_documents
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

CREATE POLICY knowledge_chunks_self_all
  ON knowledge_chunks
  FOR ALL
  TO authenticated
  USING (user_id = requesting_sub())
  WITH CHECK (user_id = requesting_sub());

CREATE OR REPLACE FUNCTION sync_user_profile(
  p_user_id TEXT,
  p_email TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_sub TEXT;
BEGIN
  v_role := requesting_role();
  v_sub := requesting_sub();

  IF v_role IS DISTINCT FROM 'service_role' AND p_user_id IS DISTINCT FROM v_sub THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO users (id, email)
  VALUES (p_user_id, p_email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT,
  p_model_used TEXT DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
  v_role TEXT;
  v_sub TEXT;
  v_perm_balance INTEGER;
  v_daily_balance INTEGER;
  v_tier TEXT;
  v_total_available INTEGER;
  v_deduct_from_daily INTEGER;
  v_deduct_from_perm INTEGER;
BEGIN
  v_role := requesting_role();
  v_sub := requesting_sub();

  IF v_role IS DISTINCT FROM 'service_role' AND p_user_id IS DISTINCT FROM v_sub THEN
    RETURN QUERY SELECT false, 0, 'forbidden';
    RETURN;
  END IF;

  PERFORM reset_daily_credits_for_user(p_user_id);

  SELECT credits, daily_credits, subscription_tier
  INTO v_perm_balance, v_daily_balance, v_tier
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_perm_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found';
    RETURN;
  END IF;

  IF v_tier = 'pro' THEN
    RETURN QUERY SELECT true, COALESCE(v_perm_balance, 0), 'Pro tier - unlimited usage';
    RETURN;
  END IF;

  v_total_available := COALESCE(v_perm_balance, 0) + COALESCE(v_daily_balance, 0);
  IF v_total_available < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_perm_balance, 0), 'Insufficient credits (Total: ' || v_total_available || ')';
    RETURN;
  END IF;

  v_deduct_from_daily := LEAST(COALESCE(v_daily_balance, 0), p_amount);
  v_deduct_from_perm := p_amount - v_deduct_from_daily;

  UPDATE users
  SET
    daily_credits = COALESCE(daily_credits, 0) - v_deduct_from_daily,
    credits = COALESCE(credits, 0) - v_deduct_from_perm,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO credits_log (user_id, amount, action, model_used, session_id, remaining_balance, metadata)
  VALUES (
    p_user_id,
    -p_amount,
    p_action,
    p_model_used,
    p_session_id,
    COALESCE(v_perm_balance, 0) - v_deduct_from_perm,
    jsonb_build_object('daily_used', v_deduct_from_daily, 'perm_used', v_deduct_from_perm)
  );

  RETURN QUERY SELECT true, (COALESCE(v_perm_balance, 0) - v_deduct_from_perm), 'Credits deducted successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT DEFAULT 'purchase',
  p_purchase_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE users
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  INSERT INTO credits_log (user_id, amount, action, remaining_balance, metadata)
  VALUES (
    p_user_id,
    p_amount,
    p_action,
    v_new_balance,
    CASE WHEN p_purchase_id IS NOT NULL THEN jsonb_build_object('purchase_id', p_purchase_id) ELSE '{}'::jsonb END
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_user_id TEXT,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  filename TEXT,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_sub TEXT;
BEGIN
  v_role := requesting_role();
  v_sub := requesting_sub();

  IF v_role IS DISTINCT FROM 'service_role' AND match_user_id IS DISTINCT FROM v_sub THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kd.filename,
    kc.content,
    kc.chunk_index,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.user_id = match_user_id
    AND kd.status = 'ready'
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION reset_daily_credits_for_user(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reset_daily_credits() FROM PUBLIC;
REVOKE ALL ON FUNCTION expire_user_subscription(TEXT) FROM PUBLIC;

REVOKE ALL ON FUNCTION add_user_credits(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION deduct_user_credits(TEXT, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION sync_user_profile(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION search_knowledge(vector(1536), TEXT, INTEGER, FLOAT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_credits(TEXT, INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge(vector(1536), TEXT, INTEGER, FLOAT) TO authenticated;

GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION deduct_user_credits(TEXT, INTEGER, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_user_credits(TEXT, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION expire_user_subscription(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION search_knowledge(vector(1536), TEXT, INTEGER, FLOAT) TO service_role;
