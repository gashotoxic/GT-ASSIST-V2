# GT Assistant Setup Guide

Complete setup instructions for GT Assistant including environment configuration, API keys, and payment integration.

## 🛠️ Prerequisites

1. **Node.js** (v18 or higher)
2. **Chutes.ai API Key** (Mandatory for AI features)
3. **Clerk Account** (Mandatory for Authentication)
4. **Supabase Account** (Mandatory for Cloud Sync & Payments)
5. **Paystack Account** (Mandatory for Monetization)

---

## 🔑 Environment Variables

Create a `.env.local` file:

```env
# AI INFERENCE
VITE_CHUTES_API_KEY=your_key

# AUTHENTICATION (CLERK)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# CLOUD SYNC (SUPABASE)
VITE_SUPABASE_URL=https://abc.supabase.co
VITE_SUPABASE_KEY=your_anon_key

# PAYMENTS (PAYSTACK)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

---

## 🔐 Authentication (Clerk)

1. Create a project at [clerk.com](https://clerk.com).
2. Copy the **Publishable Key** to your `.env.local`.
3. Configure a Clerk JWT Template for Supabase interop.
   - The app calls `getToken({ template: 'supabase' })` when available.
   - Supabase RLS policies depend on the JWT `sub` claim matching the Clerk user id.

### Clerk JWT Template (Required for Supabase RLS)
Create a JWT template named `supabase` in the Clerk dashboard.

Recommended settings:
- Token lifetime: `600` seconds (10 minutes)
- Allowed clock skew: `5` seconds

Minimum required custom claims:
```json
{
  "role": "authenticated"
}
```

Without this template, the browser will fail to fetch `/tokens/supabase` and Supabase RLS requests will return `401`.

If you see `JWT expired` in Supabase responses:
- Increase the template token lifetime (e.g. 10 minutes).
- Ensure your device clock is correct.

---

## 💳 Payments (Paystack)

1. Go to **Paystack Dashboard > Settings > API Keys**.
2. copy **Public Key** to `.env.local`.
3. Copy **Secret Key** to Supabase Secrets:
   ```bash
   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_...
   ```
4. Create 3 Subscription Plans (Basic, Plus, Pro) and note their `PLN_` codes.
5. Setup Webhook URL in Paystack pointing to your Supabase function:
   `https://[id].supabase.co/functions/v1/paystack-webhook`

---

## 🗄️ Database (Supabase)

1. Run the schema in `database/migrations/`.
   - `enable_rls_and_secure_functions.sql` (Clerk JWT-backed RLS + safe RPC)
   - `paystack_event_ledger.sql` (webhook idempotency ledger)
2. Configure **Storage Buckets**: `chat-audio` and `media-assets`.
3. Set **RLS Policies** to allow Clerk-authenticated uploads.

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

---

**Last Updated**: December 29, 2025
