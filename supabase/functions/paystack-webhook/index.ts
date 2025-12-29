import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

console.log("Paystack Webhook Function Loaded - Secure Merged Version");

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!secret || !supabaseUrl || !supabaseServiceKey) {
            console.error("Missing environment configuration");
            return new Response("Configuration Error", { status: 500 });
        }

        const signature = req.headers.get("x-paystack-signature");
        if (!signature) {
            return new Response("No signature provided", { status: 400 });
        }

        const body = await req.text();

        // 1. Verify HMAC SHA512 signature (Security First)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-512" },
            false,
            ["verify"]
        );

        const verified = await crypto.subtle.verify(
            "HMAC",
            key,
            hexToUint8Array(signature),
            encoder.encode(body)
        );

        if (!verified) {
            console.error("Invalid signature detected");
            return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body);
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log(`Processing event: ${event.event}`);

        // 2. Event Handling Logic
        if (event.event === "charge.success") {
            const { metadata, amount, customer, reference, plan } = event.data;
            const userId = metadata?.userId;

            if (!userId) {
                console.warn("No userId found in metadata - possible native paystack test or external subscription");
                return new Response("No userId found", { status: 200 }); // Still return 200 to acknowledge receipt
            }

            // A. Handle One-time Credit Packages
            if (metadata?.type === 'payment') {
                let creditsToAdd = 0;
                switch (metadata.packageId) {
                    case 'credits_50': creditsToAdd = 50; break;
                    case 'credits_150': creditsToAdd = 150; break;
                    case 'credits_500': creditsToAdd = 500; break;
                    default:
                        // Fallback logic from user code: 1 KES = 2 credits? Or similar
                        creditsToAdd = Math.floor((amount / 100) / 2);
                }

                const { error } = await supabase.rpc('add_user_credits', {
                    p_user_id: userId,
                    p_amount: creditsToAdd,
                    p_action: 'purchase',
                    p_purchase_id: reference
                });

                if (error) throw error;
                console.log(`Added ${creditsToAdd} credits to user ${userId}`);
            }

            // B. Handle Subscriptions (Native Plan or Metadata Triggered)
            if (metadata?.type === 'subscription' || plan) {
                const planCode = plan?.plan_code || metadata?.planId || "";
                let tier = 'free';

                if (planCode === 'PLN_cnrp7b3t24r6h88') tier = 'basic';
                else if (planCode === 'PLN_wv1j2miyjn8ak05') tier = 'plus';
                else if (planCode === 'PLN_id88fbjhvfyjs1g') tier = 'pro';
                // Keep .includes as fallback
                else if (planCode.includes('basic')) tier = 'basic';
                else if (planCode.includes('plus')) tier = 'plus';
                else if (planCode.includes('pro')) tier = 'pro';

                // Update user profile
                await supabase.from('users').update({
                    subscription_tier: tier,
                    paystack_customer_code: customer.customer_code,
                    updated_at: new Date().toISOString()
                }).eq('id', userId);

                // Upsert subscription record (User's historical tracking)
                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    paystack_subscription_code: event.data.subscription?.subscription_code || 'standalone_charge',
                    tier: tier,
                    status: 'active',
                    price_amount: amount / 100,
                    currency: 'KES',
                    last_payment_date: new Date().toISOString()
                }, { onConflict: 'paystack_subscription_code' });

                console.log(`Successfully upgraded user ${userId} to ${tier}`);
            }
        }

        // C. Handle Subscription Cancelled/Disabled
        if (event.event === 'subscription.disable') {
            const { customer, subscription_code } = event.data;

            // Find user by customer code (User version implementation)
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('paystack_customer_code', customer.customer_code)
                .single();

            if (userData) {
                await supabase.from('users').update({
                    subscription_tier: 'free',
                    updated_at: new Date().toISOString()
                }).eq('id', userData.id);

                await supabase.from('subscriptions').update({
                    status: 'canceled'
                }).eq('paystack_subscription_code', subscription_code);

                console.log(`Subscription disabled for user ${userData.id}`);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Webhook Internal Error:", error);
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
});

// Helper: Convert Hex String to Uint8Array for Crypto Verification
function hexToUint8Array(hexString: string) {
    const matched = hexString.match(/.{1,2}/g);
    if (!matched) return new Uint8Array();
    return new Uint8Array(matched.map((byte) => parseInt(byte, 16)));
}

