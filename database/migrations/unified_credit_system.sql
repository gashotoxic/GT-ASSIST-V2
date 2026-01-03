-- =====================================================
-- UNIFIED CREDIT & SUBSCRIPTION LIFECYCLE MIGRATION
-- =====================================================

-- 1. Function: expire_user_subscription
-- Atomically resets a user to the free tier and wipes credits upon expiration.
-- Protection: Does NOT act on users already in the 'free' tier (protecting new users).
CREATE OR REPLACE FUNCTION expire_user_subscription(p_user_id TEXT) 
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id AND subscription_tier != 'free'
  ) THEN
    -- Transition back to Free
    UPDATE users 
    SET 
      subscription_tier = 'free',
      credits = 0,               -- Reset credits for EXPIRED subscribers
      daily_credits = 0,
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the expiration
    INSERT INTO credits_log (user_id, amount, action, remaining_balance, metadata)
    VALUES (p_user_id, 0, 'subscription_expired', 0, '{"system_reset": true}'::jsonb);
    
    -- Mark active subscription records as canceled
    UPDATE subscriptions 
    SET 
      status = 'canceled',
      updated_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Function: reset_daily_credits_for_user (JIT Reset)
-- Returns the new daily balance for the user if reset occurred, or NULL
CREATE OR REPLACE FUNCTION reset_daily_credits_for_user(p_user_id TEXT) RETURNS INTEGER AS $$
DECLARE
  v_tier TEXT;
  v_last_reset TIMESTAMP;
  v_reset_amount INTEGER;
BEGIN
  SELECT subscription_tier, last_credit_reset 
  INTO v_tier, v_last_reset
  FROM users WHERE id = p_user_id;

  -- Only reset if tier is paid AND (never reset OR reset before today)
  IF v_tier IN ('basic', 'plus', 'pro') AND (v_last_reset IS NULL OR v_last_reset < CURRENT_DATE) THEN
    
    v_reset_amount := CASE 
      WHEN v_tier = 'basic' THEN 300
      WHEN v_tier = 'plus' THEN 500
      WHEN v_tier = 'pro' THEN 0  -- Pro bypasses deduction, no credits needed
      ELSE 0
    END;

    UPDATE users 
    SET 
      daily_credits = v_reset_amount,
      last_credit_reset = NOW()
    WHERE id = p_user_id;

    -- Log the auto-refill (skip for Pro since they get 0)
    IF v_reset_amount > 0 THEN
      INSERT INTO credits_log (user_id, amount, action, remaining_balance, metadata)
      SELECT id, 0, 'daily_allowance_refill', credits, jsonb_build_object('tier', v_tier, 'refill_amount', v_reset_amount)
      FROM users WHERE id = p_user_id;
    END IF;

    RETURN v_reset_amount;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Function: deduct_user_credits (JIT Enabled)
-- Prioritizes daily_credits allowance before touching permanent credits balance.
-- AUTO-RESETS daily credits if they are stale.
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT,
  p_model_used TEXT DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
  v_perm_balance INTEGER;
  v_daily_balance INTEGER;
  v_tier TEXT;
  v_total_available INTEGER;
  v_deduct_from_daily INTEGER;
  v_deduct_from_perm INTEGER;
BEGIN
  -- A. JIT RESET CHECK
  -- Before locking for deduction, check if we need to reset daily credits.
  PERFORM reset_daily_credits_for_user(p_user_id);

  -- B. Lock row for update
  SELECT credits, daily_credits, subscription_tier 
  INTO v_perm_balance, v_daily_balance, v_tier
  FROM users 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF v_perm_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found';
    RETURN;
  END IF;

  -- Pro users have unlimited usage (bypass deduction entirely)
  IF v_tier = 'pro' THEN
    RETURN QUERY SELECT true, COALESCE(v_perm_balance, 0), 'Pro tier - unlimited usage';
    RETURN;
  END IF;

  v_total_available := COALESCE(v_perm_balance, 0) + COALESCE(v_daily_balance, 0);

  IF v_total_available < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_perm_balance, 0), 'Insufficient credits (Total: ' || v_total_available || ')';
    RETURN;
  END IF;

  -- Calculate deduction split: daily credits consumed FIRST
  v_deduct_from_daily := LEAST(COALESCE(v_daily_balance, 0), p_amount);
  v_deduct_from_perm := p_amount - v_deduct_from_daily;

  -- Apply updates
  UPDATE users 
  SET 
    daily_credits = COALESCE(daily_credits, 0) - v_deduct_from_daily,
    credits = COALESCE(credits, 0) - v_deduct_from_perm,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the transaction
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

-- 4. Function: reset_daily_credits (Bulk / Cron Utility)
-- Kept for admin or bulk maintenance usage
CREATE OR REPLACE FUNCTION reset_daily_credits() RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  UPDATE users 
  SET daily_credits = CASE 
      WHEN subscription_tier = 'basic' THEN 300
      WHEN subscription_tier = 'plus' THEN 500
      WHEN subscription_tier = 'pro' THEN 0  -- Pro bypasses deduction
      ELSE COALESCE(daily_credits, 0) 
    END,
    last_credit_reset = NOW()
  WHERE subscription_tier IN ('basic', 'plus', 'pro')
    AND (last_credit_reset IS NULL OR last_credit_reset < CURRENT_DATE);
    
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
