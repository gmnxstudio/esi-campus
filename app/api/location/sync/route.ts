import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const {
            latitude,
            longitude,
            device_info,
            sync_status = "OK",
            failure_reason,
            trigger = "UNKNOWN",
        } = body;

        const now = new Date().toISOString();

        console.log(`[Sync] Received: trigger=${trigger}, status=${sync_status}, lat=${latitude}, lng=${longitude}`);

        // 1. Try to log to location_history (non-blocking, table might not exist)
        try {
            await supabase.from("location_history").insert({
                user_id: FALLBACK_USER_ID,
                latitude: latitude || 0,
                longitude: longitude || 0,
                device_info: device_info || null,
                sync_status,
                failure_reason: failure_reason || null,
                recorded_at: now,
            });
        } catch (histErr) {
            // location_history table might not exist yet — don't block the main sync
            console.warn("[Sync] History insert skipped:", histErr);
        }

        // 2. Upsert to user_locations (the critical part for admin dashboard)
        if (sync_status === "OK" && latitude != null && longitude != null && latitude !== 0 && longitude !== 0) {
            const { error } = await supabase
                .from("user_locations")
                .upsert(
                    {
                        user_id: FALLBACK_USER_ID,
                        latitude,
                        longitude,
                        device_info: device_info || null,
                        last_updated: now,
                    },
                    { onConflict: "user_id" }
                );

            if (error) {
                console.error("[Sync] Upsert error:", error.message);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            console.log(`[Sync] ✅ Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } else {
            console.log(`[Sync] ⚠ Skipped upsert: status=${sync_status}, lat=${latitude}, lng=${longitude}`);
        }

        return NextResponse.json({ success: true, sync_status, trigger, timestamp: now });
    } catch (e: any) {
        console.error("[Sync] Route error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
