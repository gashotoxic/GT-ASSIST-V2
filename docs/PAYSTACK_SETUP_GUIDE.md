# Paystack Payment Integration Setup Guide

## 1. Deploy the Webhook Function
This is the most critical step. The webhook processes payments securely.

### Option A: Manual Setup (No CLI)
1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Edge Functions** in the left sidebar.
3.  Click **Create New Function** and name it `paystack-webhook`.
4.  Open the editor.
5.  Delete everything in the editor and copy-paste the entire code from your local file at: `supabase/functions/paystack-webhook/index.ts`.
6.  Click **Save and Deploy**.

### Option B: Using the CLI
1.  **Open your terminal** in the `gt-assist-v2` folder.
2.  **Deploy the function**:
    ```bash
    npx supabase functions deploy paystack-webhook --no-verify-jwt
    ```

## 2. Get Your Webhook URL
After deployment, your webhook URL will follow this format:
```
https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/paystack-webhook
```
*   **Where to find `<YOUR_PROJECT_ID>`**: Look at your Supabase dashboard URL. It looks like `https://abcdefghijklm.supabase.co`. The `abcdefghijklm` part is your Project ID.

## 3. Configure Env Variables in Supabase
1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Settings** (gear icon) -> **Edge Functions**.
3.  Add the following secrets:
    *   `PAYSTACK_SECRET_KEY`: Your Paystack Secret Key (starts with `sk_live_` or `sk_test_`).
    *   `SUPABASE_URL`: Your full project URL (e.g., `https://abcdefghijklm.supabase.co`).
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Service Role API Key (Found in **Settings > API**. **WARNING**: Do not share this key).

## 4. Configure Paystack Dashboard
1.  Log in to [Paystack Dashboard](https://dashboard.paystack.com/).
2.  Go to **Settings** -> **API Keys & Webhooks**.
3.  Scroll down to **Webhook URL**.
4.  Paste your function URL:
    ```
    https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/paystack-webhook
    ```
5.  Click **Save Changes**.

## 5. Verify Setup
1.  Make a test payment in the app.
2.  Check the **Logs** in your Supabase Dashboard (under Edge Functions > paystack-webhook).
3.  You should see "Processing credit purchase..." logs.
