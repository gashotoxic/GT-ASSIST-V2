-- Rename columns in users table
ALTER TABLE users 
RENAME COLUMN stripe_customer_id TO paystack_customer_code;

-- Rename columns in subscriptions table
ALTER TABLE subscriptions 
RENAME COLUMN stripe_subscription_id TO paystack_subscription_code;

-- Update RLS policies if they reference old columns (Unlikely but good practice check)
-- (Assuming standard RLS based on user_id, but good to be aware)

-- Comment on columns for clarity
COMMENT ON COLUMN users.paystack_customer_code IS 'Paystack Customer Code (CUS_...)';
COMMENT ON COLUMN subscriptions.paystack_subscription_code IS 'Paystack Subscription Code (SUB_...)';
