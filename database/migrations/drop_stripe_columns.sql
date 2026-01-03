-- =====================================================
-- GT Assistant - Stripe Cleanup Migration
-- =====================================================
-- Purpose: Remove legacy Stripe columns after Paystack migration.
-- Safety: Checked for data usage; no orphaned Stripe IDs found.

-- 1. Subscriptions Table
-- We already have 'paystack_subscription_code', so we drop the old Stripe one.
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS stripe_subscription_id;

-- 2. Users Table
-- Users table already has 'paystack_customer_code' and NO stripe_customer_id.
-- (This statement handles if it theoretically existed, without error)
ALTER TABLE users 
DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Cleanup Comments/Metadata (Optional but good)
COMMENT ON COLUMN subscriptions.paystack_subscription_code IS 'Paystack Subscription Code (SUB_...)';
