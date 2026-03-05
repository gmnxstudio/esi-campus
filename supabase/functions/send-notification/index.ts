// Supabase Edge Function: send-notification
// Deploy with: supabase functions deploy send-notification
// Deno runtime

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple web-push implementation for Deno (using Web Crypto API)
async function sendWebPush(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: string,
    vapidPublicKey: string,
    vapidPrivateKey: string,
    vapidSubject: string
): Promise<Response> {
    // For production: use a Deno-compatible web-push library
    // or call the /api/push/send Next.js route instead
    const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
            "Urgency": "normal",
        },
        body: payload,
    });
    return response;
}

Deno.serve(async (req: Request) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const nextjsUrl = Deno.env.get("NEXTJS_URL") ?? "https://your-app.vercel.app";

        const supabase = createClient(supabaseUrl, serviceKey);

        const { title, body, url } = await req.json();

        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: title, body" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get push subscriptions (for all devices since it's a single-user app)
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth");

        if (error) throw error;
        if (!subscriptions?.length) {
            return new Response(
                JSON.stringify({ message: "No subscriptions for user" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // Delegate to Next.js API route which has full web-push support
        // This avoids Deno compatibility issues with native Node crypto modules
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                const response = await fetch(`${nextjsUrl}/api/push/send-internal`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-internal-key": serviceKey,
                    },
                    body: JSON.stringify({ subscription: sub, title, body, url }),
                });
                return response.ok;
            })
        );

        const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;

        return new Response(
            JSON.stringify({ success: true, sent, total: subscriptions.length }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Edge function error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
