"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Sparkles, Zap, RefreshCw } from "lucide-react";
import { AiSuggestion, Task } from "@/lib/types";
import { getAiSuggestions } from "@/app/actions/ai-assistant";

interface AiSuggestionModalProps {
    open: boolean;
    tasks: Pick<Task, "title" | "description" | "due_date" | "status">[];
    onClose: () => void;
}

const URGENCY_CONFIG = {
    high: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
    medium: { label: "Soon", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    low: { label: "Later", color: "#a5c8a5", bg: "rgba(165,200,165,0.1)", border: "rgba(165,200,165,0.3)" },
};

function LoadingState() {
    return (
        <div className="space-y-4 p-5">
            {/* Header shimmer */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl shimmer" />
                <div className="space-y-1.5 flex-1">
                    <div className="h-4 rounded-lg shimmer w-3/4" />
                    <div className="h-3 rounded-lg shimmer w-1/2" />
                </div>
            </div>
            {/* Cards shimmer */}
            {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.15)" }}>
                    <div className="h-3 rounded-lg shimmer w-1/3" />
                    <div className="h-4 rounded-lg shimmer w-4/5" />
                    <div className="h-3 rounded-lg shimmer w-2/3" />
                </div>
            ))}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.15)" }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 rounded-lg shimmer" style={{ width: `${85 - i * 10}%` }} />
                ))}
            </div>
            <p className="text-center text-xs text-latte-300 pt-2 flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 animate-pulse" />
                AI Agent sedang menganalisis semua task kamu...
            </p>
        </div>
    );
}

export default function AiSuggestionModal({ open, tasks, onClose }: AiSuggestionModalProps) {
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function fetchSuggestion() {
        setLoading(true);
        setError("");
        setSuggestion(null);
        try {
            const result = await getAiSuggestions(tasks);
            setSuggestion(result);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Gagal menghubungi AI. Coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // Auto-fetch whenever the modal opens
    useEffect(() => {
        if (open && !suggestion && !loading) {
            fetchSuggestion();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center modal-overlay" style={{ padding: '0' }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Bottom sheet modal */}
            <div
                className="relative w-full max-w-lg modal-content flex flex-col rounded-t-4xl overflow-hidden"
                style={{
                    background: "linear-gradient(160deg, #faf9f7 0%, #f5f0e8 40%, #fdf5f5 100%)",
                    maxHeight: "88dvh",
                    boxShadow: "0 -8px 48px rgba(200,169,126,0.2), 0 -2px 8px rgba(0,0,0,0.06)"
                }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-latte-200" />
                </div>

                {/* Header */}
                <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{
                            background: "linear-gradient(135deg, rgba(200,169,126,0.2), rgba(232,165,165,0.2))"
                        }}>
                            <Zap className="w-4.5 h-4.5 text-latte-500" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-latte-700">AI Coach</p>
                            <p className="text-[11px] text-latte-400">{tasks.length} tasks analyzed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {suggestion && !loading && (
                            <button
                                onClick={fetchSuggestion}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-latte-100 transition-all active:scale-90"
                                title="Refresh analysis"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-latte-100 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 pb-6">

                    {/* Loading */}
                    {loading && <LoadingState />}

                    {/* Error */}
                    {error && !loading && (
                        <div className="px-5 py-8 text-center">
                            <p className="text-3xl mb-3">😔</p>
                            <p className="text-sm font-medium text-latte-600 mb-1">Something went wrong</p>
                            <p className="text-xs text-latte-400 mb-5">{error}</p>
                            <button
                                onClick={fetchSuggestion}
                                className="px-5 py-2.5 rounded-2xl bg-latte-400 text-white text-xs font-semibold flex items-center gap-2 mx-auto transition-all active:scale-95"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Result */}
                    {suggestion && !loading && (
                        <div className="px-5 space-y-4">
                            {/* Overall Status */}
                            <div className="rounded-3xl p-4" style={{
                                background: "linear-gradient(135deg, rgba(200,169,126,0.12) 0%, rgba(232,165,165,0.12) 100%)",
                                border: "1px solid rgba(200,169,126,0.2)"
                            }}>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-xl flex-shrink-0 mt-0.5">🎯</span>
                                    <p className="text-sm font-medium text-latte-700 leading-relaxed">{suggestion.overall_status}</p>
                                </div>
                            </div>

                            {/* Priority Tasks */}
                            {suggestion.priority_tasks.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wider mb-2.5">🔥 Priority Tasks</p>
                                    <div className="space-y-2">
                                        {suggestion.priority_tasks.map((task, i) => {
                                            const cfg = URGENCY_CONFIG[task.urgency];
                                            return (
                                                <div key={i} className="rounded-2xl p-3.5 flex items-start gap-3" style={{
                                                    background: cfg.bg,
                                                    border: `1px solid ${cfg.border}`
                                                }}>
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0"
                                                        style={{ background: cfg.color, color: "white" }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-latte-700 truncate">{task.title}</p>
                                                        <p className="text-xs text-latte-500 mt-0.5 leading-relaxed">{task.reason}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Action Plan */}
                            <div>
                                <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wider mb-2.5">✅ Action Plan</p>
                                <div className="rounded-2xl overflow-hidden border border-latte-200/60" style={{ background: "rgba(255,255,255,0.7)" }}>
                                    {suggestion.action_plan.map((action, i) => (
                                        <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < suggestion.action_plan.length - 1 ? "border-b border-latte-100" : ""}`}>
                                            <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5" style={{
                                                background: "linear-gradient(135deg, #c8a97e, #e8a5a5)"
                                            }}>
                                                {i + 1}
                                            </span>
                                            <p className="text-xs text-latte-700 leading-relaxed">{action}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Wellness Tip + Motivation */}
                            <div className="grid grid-cols-1 gap-2">
                                <div className="rounded-2xl p-3.5" style={{
                                    background: "rgba(165,200,165,0.1)",
                                    border: "1px solid rgba(165,200,165,0.25)"
                                }}>
                                    <p className="text-[10px] font-bold text-green-600/70 uppercase tracking-wide mb-1">🌿 Wellness Tip</p>
                                    <p className="text-xs text-latte-600 leading-relaxed">{suggestion.wellness_tip}</p>
                                </div>
                                <div className="rounded-2xl p-3.5" style={{
                                    background: "rgba(232,165,165,0.1)",
                                    border: "1px solid rgba(232,165,165,0.2)"
                                }}>
                                    <p className="text-[10px] font-bold text-rose-500/70 uppercase tracking-wide mb-1">💕 From Your AI Coach</p>
                                    <p className="text-xs text-latte-600 leading-relaxed italic">{suggestion.motivation}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
