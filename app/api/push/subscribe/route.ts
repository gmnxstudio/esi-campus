import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { endpoint, p256dh, auth, userAgent, device_id } = await request.json();

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
        }

        // Build the upsert payload — only include device_id if the column exists
        const payload: Record<string, any> = {
            endpoint,
            p256dh,
            auth,
            user_agent: userAgent,
        };

        // Try upsert with device_id first, fall back without it if column doesn't exist
        let result = await supabase
            .from("push_subscriptions")
            .upsert({ ...payload, device_id: device_id || null }, { onConflict: "endpoint" });

        if (result.error?.message?.includes("device_id")) {
            // device_id column doesn't exist yet — retry without it
            console.warn("[Subscribe] device_id column not found, retrying without it.");
            result = await supabase
                .from("push_subscriptions")
                .upsert(payload, { onConflict: "endpoint" });
        }

        if (result.error) {
            console.error("Push subscription save error:", result.error);
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Subscribe route error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
