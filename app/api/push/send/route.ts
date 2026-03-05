import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webPush from "web-push";

// Configure VAPID
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { title, body, url } = await request.json();

        // Get all subscriptions (single user mode)
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("*");

        if (error || !subscriptions?.length) {
            return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
        }

        const payload = JSON.stringify({ title, body, url: url || "/" });

        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                webPush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    payload
                )
            )
        );

        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            sent: results.length - failed,
            failed,
        });
    } catch (e) {
        console.error("Send notification error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
