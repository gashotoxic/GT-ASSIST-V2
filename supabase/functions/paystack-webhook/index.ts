// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// @ts-ignore
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

console.log("Paystack Webhook Function Loaded - Unified Lifecycle v2 (Stripe-Free)");

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!secret) return new Response("Secret Error", { status: 500 });
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) return new Response("No signature", { status: 400 });

    const body = await req.text();

    // 1. SIGNATURE VERIFICATION
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedHex = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedHex.toLowerCase() !== signature.toLowerCase()) {
      console.error("Signature Mismatch");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const rawEventId =
      event?.data?.id ??
      event?.data?.subscription_code ??
      event?.data?.reference ??
      event?.data?.invoice_code ??
      null;

    const paystackEventId = rawEventId ? `${event.event}:${String(rawEventId)}` : null;

    if (paystackEventId) {
      const userId = event?.data?.metadata?.userId || null;
      const reference = event?.data?.reference || null;
      const amountKes = typeof event?.data?.amount === 'number' ? event.data.amount / 100 : null;

      const { data: ledgerInsert } = await supabase
        .from('paystack_event_ledger')
        .upsert(
          {
            paystack_event_id: paystackEventId,
            event_type: event.event,
            reference,
            user_id: userId,
            amount_kes: amountKes,
            payload: event,
          },
          { onConflict: 'paystack_event_id', ignoreDuplicates: true }
        )
        .select('paystack_event_id');

      if (!ledgerInsert || ledgerInsert.length === 0) {
        return new Response('ACK - Duplicate', { status: 200 });
      }
    }

    // 2. EVENT HANDLING
    if (event.event === "charge.success") {
      const { metadata, amount, customer, reference, plan } = event.data;
      const userId = metadata?.userId;

      if (!userId) {
        console.log("No userId in metadata, skipping.");
        return new Response("ACK - No User", { status: 200 });
      }

      // A. Handle Credit Packs
      if (metadata?.type === 'payment') {
        let credits = 0;
        if (metadata.packageId === 'credits_50') credits = 50;
        else if (metadata.packageId === 'credits_150') credits = 150;
        else if (metadata.packageId === 'credits_500') credits = 500;
        else credits = Math.floor((amount / 100) / 2);

        await supabase.rpc('add_user_credits', { p_user_id: userId, p_amount: credits, p_action: 'purchase', p_purchase_id: reference });
        console.log(`Credits Added: ${credits} to ${userId}`);
      }

      // B. Handle Subscriptions
      if (metadata?.type === 'subscription' || plan) {
        const planCode = plan?.plan_code || metadata?.planId || "";
        let tier = 'free';
        let dailyAmount = 0;

        // PLAN MAPPING - Pro uses bypass, so no daily credits needed
        if (planCode === 'PLN_x6kcyeqtmwqbeca') { tier = 'basic'; dailyAmount = 300; }
        else if (planCode === 'PLN_qc1j9mcx0vv3hbf') { tier = 'plus'; dailyAmount = 500; }
        else if (planCode === 'PLN_krcucsvyw6hucdo') { tier = 'pro'; dailyAmount = 0; } // Pro bypasses deduction
        else if (planCode.includes('basic')) { tier = 'basic'; dailyAmount = 300; }
        else if (planCode.includes('plus')) { tier = 'plus'; dailyAmount = 500; }
        else if (planCode.includes('pro')) { tier = 'pro'; dailyAmount = 0; } // Pro bypasses deduction

        if (tier !== 'free') {
          // Update User Profile
          await supabase.from('users').update({
            subscription_tier: tier,
            daily_credits: dailyAmount,
            last_credit_reset: new Date().toISOString(),
            paystack_customer_code: customer.customer_code, // Updated column name
            updated_at: new Date().toISOString()
          }).eq('id', userId);

          // Update Subscription Record
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            paystack_subscription_code: event.data.subscription?.subscription_code || reference || 'sub_unknown', // Updated column name
            tier: tier,
            status: 'active',
            price_amount: amount / 100,
            currency: 'KES',
            interval: 'monthly',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'paystack_subscription_code' }); // Updated constraint

          console.log(`User ${userId} upgraded to ${tier} with ${dailyAmount} daily credits`);
        }
      }
    }

    // C. EXPIRATION HANDLING
    else if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const subCode = event.data.subscription_code;

      console.log(`Subscription disabled/expired: ${subCode}`);

      // 1. Find user by the subscription code (using new column name)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('paystack_subscription_code', subCode)
        .single();

      if (sub?.user_id) {
        console.log(`Resetting user ${sub.user_id} to free tier...`);
        // 2. Call the Atomic Expiration Function
        await supabase.rpc('expire_user_subscription', { p_user_id: sub.user_id });
      } else {
        console.log("User not found for disabled subscription");
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Fatal:", err.message);
    return new Response(err.message, { status: 500 });
  }
});
