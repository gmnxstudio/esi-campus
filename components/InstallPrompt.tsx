"use client";

import { useState, useEffect } from "react";
import { Share, X } from "lucide-react";

export default function InstallPrompt() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        // @ts-expect-error — standalone only exists on iOS Safari
        const isStandalone = window.navigator.standalone === true;
        const dismissed = localStorage.getItem("install-prompt-dismissed");

        if (isIOS && !isStandalone && !dismissed) {
            setTimeout(() => setShow(true), 4000);
        }
    }, []);

    function dismiss() {
        setShow(false);
        localStorage.setItem("install-prompt-dismissed", "true");
    }

    if (!show) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up max-w-lg mx-auto"
            style={{ bottom: `calc(5.5rem + env(safe-area-inset-bottom, 0px))` }}>
            <div className="glass-card rounded-3xl p-4 shadow-glass-lg border border-latte-200">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-latte-50 flex items-center justify-center flex-shrink-0 text-xl">
                        📱
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-latte-700">Add to Home Screen</p>
                        <p className="text-xs text-latte-400 mt-1 leading-relaxed">
                            Install <strong>Praishe&apos;s Campus</strong> for the best experience and to receive push notifications.
                        </p>
                        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-latte-500 font-medium">
                            <span>Tap</span>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-latte-50 rounded-lg border border-latte-200">
                                <Share className="w-3 h-3" /> Share
                            </span>
                            <span>then</span>
                            <span className="px-2 py-0.5 bg-latte-50 rounded-lg border border-latte-200">
                                Add to Home Screen
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-300 hover:text-latte-500 hover:bg-latte-50 transition-all flex-shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
