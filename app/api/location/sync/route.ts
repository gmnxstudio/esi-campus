import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { latitude, longitude, device_info, sync_status, failure_reason } = await request.json();

        const now = new Date().toISOString();

        // Always log to location_history (even failures)
        const historyPayload: Record<string, any> = {
            user_id: FALLBACK_USER_ID,
            latitude: latitude || 0,
            longitude: longitude || 0,
            device_info: device_info || null,
            sync_status: sync_status || "OK",
            recorded_at: now,
        };

        if (failure_reason) {
            historyPayload.failure_reason = failure_reason;
        }

        await supabase.from("location_history").insert(historyPayload);

        // Only upsert to user_locations if we have valid coordinates
        if (sync_status === "OK" && latitude && longitude) {
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
        }

        return NextResponse.json({ success: true, sync_status });
    } catch (e: any) {
        console.error("[Sync] Route error:", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
