# Clerk-Supabase Integration Fix

## Problem Summary
The application is experiencing "invalid input syntax for type uuid" errors because:
- Clerk user IDs are text strings like `user_36w3Fapt8nVkGFm2Uo4mNIOTRsM`
- Database functions expect UUID parameters but the `users.id` column is TEXT
- This causes type mismatch errors when calling RPC functions

## Root Cause Analysis
Looking at the error logs:
```
invalid input syntax for type uuid: "user_36w3Fapt8nVkGFm2Uo4mNIOTRsM"
```

The issue occurs in these database functions:
1. `deduct_user_credits(p_user_id UUID, ...)`
2. `add_user_credits(p_user_id UUID, ...)`
3. `sync_user_profile(p_user_id UUID, ...)`

These functions expect UUID but receive Clerk's text-based user IDs.

## Solution: Update Database Functions

The `users.id` column is correctly defined as TEXT (line 16 in week2_database_schema.sql), but the functions need to be updated to match.

### Manual Migration Steps

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Update deduct_user_credits function to use TEXT instead of UUID
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

-- Update add_user_credits function to use TEXT instead of UUID
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

-- Update sync_user_profile function to use TEXT instead of UUID
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
```

## Expected Result
After applying these changes:
1. ✅ Clerk user IDs will be accepted by all database functions
2. ✅ No more "invalid input syntax for type uuid" errors
3. ✅ User sync will work correctly
4. ✅ Credit deduction will function properly
5. ✅ The infinite loop of failed user creation attempts will stop

## Verification Steps
1. Check browser console for errors
2. Try logging in with a Clerk account
3. Verify user profile is created in Supabase
4. Test credit deduction functionality
5. Confirm no more 400 status errors in network tab

## Alternative Solution (If Above Doesn't Work)
If the above migration fails due to RLS policy issues, you may need to:

1. **Drop and recreate the functions** (if they have dependencies):
```sql
DROP FUNCTION IF EXISTS deduct_user_credits;
DROP FUNCTION IF EXISTS add_user_credits;
DROP FUNCTION IF EXISTS sync_user_profile;
-- Then run the CREATE OR REPLACE statements above
```

2. **Update RLS policies** if they reference these functions with old signatures

The application code is already correctly structured to work with TEXT user IDs, so once the database functions are fixed, the integration should work seamlessly.