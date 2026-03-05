"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, X, Loader2, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return new Uint8Array(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

export default function NotificationBanner({ onDismiss }: { onDismiss: () => void }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "denied" | "error">("idle");
    const supabase = createClient();

    async function subscribeToNotifications() {
        setLoading(true);
        try {
            // 1. Check SW support
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setStatus("error");
                return;
            }

            // 2. Request permission
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setStatus("denied");
                return;
            }

            // 3. Get SW registration
            const registration = await navigator.serviceWorker.ready;

            // 4. Subscribe via VAPID
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
            });

            // 5. Send subscription to our API
            const sub = subscription.toJSON();
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: sub.endpoint,
                    p256dh: sub.keys?.p256dh,
                    auth: sub.keys?.auth,
                    userAgent: navigator.userAgent,
                }),
            });

            if (response.ok) {
                setStatus("success");
                setTimeout(onDismiss, 2000);
            } else {
                setStatus("error");
            }
        } catch {
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    const content = {
        idle: {
            icon: <Bell className="w-5 h-5 text-latte-400" strokeWidth={1.5} />,
            title: "Enable Notifications",
            desc: "Get class reminders, task deadlines & exam alerts from your Guardian 🌸",
            cta: "Turn On",
            ctaClass: "bg-latte-400 text-white hover:bg-latte-500",
        },
        success: {
            icon: <span className="text-xl">🎉</span>,
            title: "Notifications Enabled!",
            desc: "Your Guardian is watching over you. You'll never miss a class again.",
            cta: null,
            ctaClass: "",
        },
        denied: {
            icon: <BellOff className="w-5 h-5 text-latte-300" />,
            title: "Notifications Blocked",
            desc: "Enable notifications in your browser/device settings to receive class reminders.",
            cta: "Got it",
            ctaClass: "bg-latte-100 text-latte-500",
        },
        error: {
            icon: <Bell className="w-5 h-5 text-red-400" />,
            title: "Couldn't Enable",
            desc: "Something went wrong. Make sure the app is installed to your Home Screen on iOS.",
            cta: "Try again",
            ctaClass: "bg-latte-100 text-latte-500",
        },
    }[status];

    return (
        <div className="glass-card rounded-3xl p-4 animate-slide-down border border-latte-200">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-latte-50 flex items-center justify-center flex-shrink-0">
                    {content.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-latte-700">{content.title}</p>
                    <p className="text-xs text-latte-400 mt-0.5 leading-relaxed">{content.desc}</p>
                    {content.cta && (
                        <button
                            onClick={status === "idle" ? subscribeToNotifications : onDismiss}
                            disabled={loading}
                            className={`mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 ${content.ctaClass}`}
                        >
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {content.cta}
                        </button>
                    )}
                </div>
                <button
                    onClick={onDismiss}
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-300 hover:text-latte-500 hover:bg-latte-50 transition-all flex-shrink-0"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
