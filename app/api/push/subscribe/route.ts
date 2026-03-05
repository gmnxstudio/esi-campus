import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { endpoint, p256dh, auth, userAgent } = await request.json();

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
        }

        // Upsert on endpoint to avoid duplicates
        const { error } = await supabase.from("push_subscriptions").upsert(
            { endpoint, p256dh, auth, user_agent: userAgent },
            { onConflict: "endpoint" }
        );

        if (error) {
            console.error("Push subscription save error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Subscribe route error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
