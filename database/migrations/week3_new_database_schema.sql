-- =====================================================
-- GT Assistant - Week 3 Database Schema (New Instance)
-- =====================================================
-- Purpose: Complete database schema for new Supabase instance
-- Key Change: All user_id columns and function parameters use TEXT for Clerk compatibility
-- Database: ybuogspdugmqcyvhsjyr.supabase.co
-- =====================================================

-- =====================================================
-- STEP 1: Create base tables (chat_sessions, messages, media_history)
-- =====================================================

-- Create chat_sessions table (no user_id yet, added in Step 2)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  preview TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table (no user_id yet, added in Step 2)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content JSONB NOT NULL,
  audio_url TEXT,
  cost_credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create media_history table (no user_id yet, added in Step 2)
CREATE TABLE IF NOT EXISTS media_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  title TEXT,
  url TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create users table and add user_id columns
-- =====================================================

-- CRITICAL: users.id is TEXT to match Clerk user IDs (e.g., "user_36w3Fapt8nVkGFm2Uo4mNIOTRsM")
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Clerk user ID in text format
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 10,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'plus', 'pro')),
  daily_credits INTEGER DEFAULT 0,
  last_credit_reset TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add user_id to chat_sessions table (references users.id as TEXT)
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Add user_id to messages table (references users.id as TEXT)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Add user_id to media_history table (references users.id as TEXT)
ALTER TABLE media_history
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 3: Create credits audit log
-- =====================================================

-- CRITICAL: user_id is TEXT to match users.id
CREATE TABLE IF NOT EXISTS credits_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- negative for usage, positive for purchase
  action TEXT NOT NULL CHECK (action IN ('chat', 'image', 'video', 'edit', 'purchase', 'daily_reset', 'refund')),
  model_used TEXT,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  remaining_balance INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create subscriptions table
-- =====================================================

-- CRITICAL: user_id is TEXT to match users.id
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'plus', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  price_amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'kes',
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 5: Create user API keys table (BYOK - Bring Your Own Key)
-- =====================================================

-- CRITICAL: user_id is TEXT to match users.id
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('chutes', 'tavily', 'brave')),
  key_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 6: Create performance indexes
-- =====================================================

-- Indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_cost ON messages(cost_credits);

-- Indexes for media_history
CREATE INDEX IF NOT EXISTS idx_media_history_user ON media_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_history_session ON media_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_history_type ON media_history(type);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits);

-- Indexes for credits_log
CREATE INDEX IF NOT EXISTS idx_credits_log_user ON credits_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_log_action ON credits_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_log_session ON credits_log(session_id);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Indexes for user_api_keys
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service ON user_api_keys(service);

-- =====================================================
-- STEP 7: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: Create functions with TEXT user_id parameters
-- =====================================================

-- CRITICAL: All functions use TEXT for user_id to match Clerk IDs
-- Function: deduct_user_credits (with TEXT user_id)
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT,
  p_model_used TEXT DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
  v_current_balance INTEGER;
  v_tier TEXT;
  v_new_balance INTEGER;
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT credits, subscription_tier 
  INTO v_current_balance, v_tier
  FROM users 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found';
    RETURN;
  END IF;

  -- Pro users have unlimited credits
  IF v_tier = 'pro' THEN
    RETURN QUERY SELECT true, v_current_balance, 'Pro user - unlimited credits';
    RETURN;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, v_current_balance, 'Insufficient credits';
    RETURN;
  END IF;

  -- Deduct credits
  UPDATE users 
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  -- Log the transaction
  INSERT INTO credits_log (user_id, amount, action, model_used, session_id, remaining_balance)
  VALUES (p_user_id, -p_amount, p_action, p_model_used, p_session_id, v_new_balance);

  RETURN QUERY SELECT true, v_new_balance, 'Credits deducted successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: add_user_credits (with TEXT user_id)
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_action TEXT DEFAULT 'purchase',
  p_purchase_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Add credits to user account
  UPDATE users 
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  -- Log the transaction
  INSERT INTO credits_log (user_id, amount, action, remaining_balance, metadata)
  VALUES (p_user_id, p_amount, p_action, v_new_balance, 
          CASE WHEN p_purchase_id IS NOT NULL THEN jsonb_build_object('purchase_id', p_purchase_id) ELSE '{}'::jsonb END);

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding credits: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: sync_user_profile (with TEXT user_id)
CREATE OR REPLACE FUNCTION sync_user_profile(
  p_user_id TEXT,
  p_email TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO users (id, email)
  VALUES (p_user_id, p_email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error syncing user profile: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: reset_daily_credits
CREATE OR REPLACE FUNCTION reset_daily_credits() RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  -- Reset daily credits for paid tiers
  UPDATE users 
  SET daily_credits = CASE 
      WHEN subscription_tier = 'basic' THEN 300
      WHEN subscription_tier = 'plus' THEN 500
      WHEN subscription_tier = 'pro' THEN 999999
      ELSE daily_credits -- Keep existing for free tier
    END,
    last_credit_reset = NOW()
  WHERE subscription_tier IN ('basic', 'plus', 'pro')
    AND (last_credit_reset IS NULL OR last_credit_reset < CURRENT_DATE);
    
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  
  -- Log the resets
  INSERT INTO credits_log (user_id, amount, action, remaining_balance)
  SELECT id, 
         CASE 
           WHEN subscription_tier = 'basic' THEN 300
           WHEN subscription_tier = 'plus' THEN 500
           WHEN subscription_tier = 'pro' THEN 999999
           ELSE 0
         END,
         'daily_reset',
         credits
  FROM users 
  WHERE subscription_tier IN ('basic', 'plus', 'pro')
    AND (last_credit_reset IS NULL OR last_credit_reset < CURRENT_DATE);
    
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: Triggers for updated_at timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 10: Grant necessary permissions
-- =====================================================

-- Remove grants to auth.users and authenticated role (using Clerk, not Supabase Auth)
-- Instead, ensure service_role and postgres can manage all tables
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON users TO postgres;
GRANT ALL ON users TO service_role;
GRANT ALL ON credits_log TO postgres;
GRANT ALL ON credits_log TO service_role;
GRANT ALL ON subscriptions TO postgres;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON user_api_keys TO postgres;
GRANT ALL ON user_api_keys TO service_role;
GRANT ALL ON chat_sessions TO postgres;
GRANT ALL ON chat_sessions TO service_role;
GRANT ALL ON messages TO postgres;
GRANT ALL ON messages TO service_role;
GRANT ALL ON media_history TO postgres;
GRANT ALL ON media_history TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION deduct_user_credits TO postgres;
GRANT EXECUTE ON FUNCTION deduct_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION add_user_credits TO postgres;
GRANT EXECUTE ON FUNCTION add_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION sync_user_profile TO postgres;
GRANT EXECUTE ON FUNCTION sync_user_profile TO service_role;
GRANT EXECUTE ON FUNCTION reset_daily_credits TO postgres;
GRANT EXECUTE ON FUNCTION reset_daily_credits TO service_role;

-- =====================================================
-- STEP 11: Storage buckets (if not already created)
-- =====================================================

-- Note: Storage buckets need to be created via Supabase UI or separate API call
-- These are the required buckets:
-- - chat-audio: For storing audio recordings
-- - media-assets: For storing generated images and videos

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Create storage buckets via Supabase UI: Storage -> Buckets -> New Bucket
--    - Bucket name: chat-audio (public: true)
--    - Bucket name: media-assets (public: true)
-- 3. Test Clerk authentication and user sync
-- 4. Verify credit system works correctly
-- 5. Test all CRUD operations
-- =====================================================