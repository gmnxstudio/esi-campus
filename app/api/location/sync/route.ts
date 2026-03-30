import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const {
            device_id,
            latitude,
            longitude,
            device_info,
            sync_status = "OK",
            failure_reason,
            trigger = "UNKNOWN",
        } = body;

        // Use device_id from client, or generate one server-side as fallback
        const userId = device_id || crypto.randomUUID();
        const now = new Date().toISOString();

        console.log(`[Sync] device=${userId.substring(0, 8)}... trigger=${trigger} status=${sync_status} lat=${latitude} lng=${longitude}`);

        // 1. Log to location_history (non-blocking)
        try {
            await supabase.from("location_history").insert({
                user_id: userId,
                latitude: latitude || 0,
                longitude: longitude || 0,
                device_info: device_info || null,
                sync_status,
                failure_reason: failure_reason || null,
                recorded_at: now,
            });
        } catch (histErr) {
            console.warn("[Sync] History insert skipped:", histErr);
        }

        // 2. Upsert to user_locations (main table for admin dashboard)
        if (sync_status === "OK" && latitude != null && longitude != null && latitude !== 0 && longitude !== 0) {
            const { error } = await supabase
                .from("user_locations")
                .upsert(
                    {
                        user_id: userId,
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

            console.log(`[Sync] ✅ Updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        return NextResponse.json({ success: true, device_id: userId, sync_status, trigger });
    } catch (e: any) {
        console.error("[Sync] Route error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
