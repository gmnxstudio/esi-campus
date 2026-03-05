"use client";

import { useState } from "react";
import { Bell, X, Loader2, BellOff, ShieldAlert, WifiOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return new Uint8Array(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

function isIosDevice(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isRunningAsStandalone(): boolean {
    return window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;
}

type NotifStatus = "idle" | "success" | "denied" | "error" | "https_required" | "not_supported" | "ios_browser";

export default function NotificationBanner({ onDismiss }: { onDismiss: () => void }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<NotifStatus>("idle");
    const [errorDetail, setErrorDetail] = useState("");

    async function subscribeToNotifications() {
        setLoading(true);
        try {
            // 1. HTTPS check — Web Push requires HTTPS (except localhost)
            const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
            if (!isLocalhost && location.protocol !== "https:") {
                setStatus("https_required");
                return;
            }

            // 2. Check Service Worker + PushManager support
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                // iOS: jika buka di Safari (bukan Home Screen), PushManager tidak ada
                if (isIosDevice() && !isRunningAsStandalone()) {
                    setStatus("ios_browser");
                } else {
                    setStatus("not_supported");
                }
                return;
            }

            // 3. Request permission
            const permission = await Notification.requestPermission();
            if (permission === "denied") {
                setStatus("denied");
                return;
            }
            if (permission !== "granted") {
                setStatus("idle"); // user mungkin dismiss prompt
                return;
            }

            // 4. Get SW registration
            const registration = await navigator.serviceWorker.ready;

            // 5. Subscribe via VAPID
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
            });

            // 6. Save subscription to API
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
                setTimeout(onDismiss, 2500);
            } else {
                const err = await response.json().catch(() => ({}));
                setErrorDetail(err.error ?? "Server error");
                setStatus("error");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setErrorDetail(msg);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    type ContentDef = {
        icon: React.ReactNode;
        title: string;
        desc: string;
        cta: string | null;
        ctaClass: string;
        onCta?: () => void;
    };

    const content: ContentDef = {
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
            desc: "Enable notifications in your iPhone Settings → Safari/Campus → Notifications.",
            cta: "Got it",
            ctaClass: "bg-latte-100 text-latte-500",
        },
        https_required: {
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
            title: "HTTPS Required",
            desc: "Push notifications need a secure connection. Use ngrok/localtunnel or deploy to Vercel for HTTPS.",
            cta: "Got it",
            ctaClass: "bg-amber-50 text-amber-600",
        },
        not_supported: {
            icon: <WifiOff className="w-5 h-5 text-latte-300" />,
            title: "Not Supported",
            desc: "Your browser doesn't support push notifications. Try Chrome or open this as a PWA.",
            cta: "Got it",
            ctaClass: "bg-latte-100 text-latte-500",
        },
        ios_browser: {
            icon: <span className="text-xl">📲</span>,
            title: "Open from Home Screen",
            desc: "Untuk mengaktifkan notifikasi di iPhone: tap Share → Add to Home Screen → buka app dari Home Screen.",
            cta: "Got it",
            ctaClass: "bg-latte-100 text-latte-500",
        },
        error: {
            icon: <Bell className="w-5 h-5 text-red-400" />,
            title: "Couldn't Enable",
            desc: errorDetail
                ? `Error: ${errorDetail.slice(0, 80)}`
                : "Something went wrong. Check console for details.",
            cta: "Try again",
            ctaClass: "bg-latte-100 text-latte-500",
        },
    }[status];

    const isRetriable = ["error", "idle"].includes(status);
    const isDismissible = !["idle", "success"].includes(status);

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
                            onClick={
                                isRetriable
                                    ? subscribeToNotifications
                                    : onDismiss
                            }
                            disabled={loading}
                            className={`mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 ${content.ctaClass}`}
                        >
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {content.cta}
                        </button>
                    )}
                </div>
                {(isDismissible || status === "success") && (
                    <button
                        onClick={onDismiss}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-300 hover:text-latte-500 hover:bg-latte-50 transition-all flex-shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
