import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webPush from "web-push";

// Tell Next.js this route is dynamic (uses request.headers)
export const dynamic = "force-dynamic";

// Configure VAPID
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// Motivational messages for the push payload
const MOTIVATIONAL_MESSAGES = [
    { title: "Semangat Hari Ini! 🌟", body: "Satu langkah lebih dekat menuju impianmu!" },
    { title: "Pengingat Kampus 📚", body: "Jangan lupa minum air dan istirahat ya!" },
    { title: "Kamu Hebat! 💪", body: "Setiap usaha kecil membuahkan hasil besar." },
    { title: "Tips Produktif ✨", body: "Fokus 25 menit, istirahat 5 menit." },
    { title: "Motivasi ☀️", body: "Hari ini kesempatan baru untuk lebih baik." },
    { title: "Jaga Kesehatan 💚", body: "Sudah makan? Nutrisi penting untuk otak!" },
    { title: "Campus Reminder 🎓", body: "Cek jadwal kuliah hari ini!" },
    { title: "Deadline Alert 📝", body: "Ada tugas mendekati deadline? Cek sekarang!" },
    { title: "Study Break ☕", body: "Istirahat sejenak untuk melihat yang jauh." },
    { title: "Stay Strong 🔥", body: "Kamu pasti bisa melewati tantangan hari ini!" },
];

function getRandomMessage() {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

export async function GET(request: Request) {
    try {
        // Verify cron secret (Vercel sends this as Authorization header)
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = await createClient();

        // Get all active push subscriptions
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("*");

        if (error || !subscriptions?.length) {
            return NextResponse.json({
                success: false,
                message: "No active subscriptions found",
            });
        }

        const msg = getRandomMessage();

        // Build the SYNC_PULSE payload
        const payload = JSON.stringify({
            type: "SYNC_PULSE",
            title: msg.title,
            body: msg.body,
            url: "/",
        });

        // Send push to all subscriptions
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

        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        // Clean up expired/invalid subscriptions
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === "rejected") {
                const reason = (results[i] as PromiseRejectedResult).reason;
                if (reason?.statusCode === 410 || reason?.statusCode === 404) {
                    // Subscription expired, remove it
                    await supabase
                        .from("push_subscriptions")
                        .delete()
                        .eq("endpoint", subscriptions[i].endpoint);
                }
            }
        }

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: subscriptions.length,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        console.error("[Cron] Sync pulse error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
