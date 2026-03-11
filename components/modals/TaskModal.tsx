"use client";

import { useState, useEffect } from "react";
import { Task, ClassWithRelations, AiPlan } from "@/lib/types";
import { X, Loader2, Sparkles } from "lucide-react";
import { generateTaskPlan } from "@/app/actions/ai-assistant";

interface TaskModalProps {
    open: boolean;
    classId?: string;
    existing?: Task;
    classes: ClassWithRelations[];
    onClose: () => void;
    onCreate: (data: Omit<Task, "id" | "created_at" | "updated_at">) => Promise<void>;
    onUpdate: (id: string, data: Partial<Task>) => Promise<void>;
}

const emptyForm = {
    class_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "pending" as Task["status"],
};

// ── Magic Card: Displays AI Plan result ─────────────────────
function AiPlanCard({ plan }: { plan: AiPlan }) {
    return (
        <div className="rounded-3xl overflow-hidden border border-latte-200/60 animate-slide-down" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,232,232,0.6) 50%, rgba(245,240,232,0.8) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 4px 32px rgba(200,169,126,0.15), 0 1px 4px rgba(0,0,0,0.04)"
        }}>
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <span className="text-base">✨</span>
                <p className="text-xs font-bold text-latte-600 uppercase tracking-wider">AI Study Plan</p>
            </div>

            <div className="px-4 pb-4 space-y-3">
                {/* Summary */}
                <div className="flex gap-2.5">
                    <span className="text-sm mt-0.5 flex-shrink-0">📝</span>
                    <div>
                        <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wide mb-0.5">Summary</p>
                        <p className="text-xs text-latte-700 leading-relaxed">{plan.summary}</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="flex gap-2.5">
                    <span className="text-sm mt-0.5 flex-shrink-0">✅</span>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wide mb-1.5">Steps</p>
                        <div className="space-y-1.5">
                            {plan.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white mt-0.5" style={{ background: "linear-gradient(135deg, #c8a97e, #e8a5a5)" }}>
                                        {i + 1}
                                    </span>
                                    <p className="text-xs text-latte-700 leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Time & Motivation */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl p-3" style={{ background: "rgba(200,169,126,0.08)" }}>
                        <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wide mb-0.5">⏳ Est. Time</p>
                        <p className="text-xs font-semibold text-latte-700">{plan.estimated_time}</p>
                    </div>
                    <div className="rounded-2xl p-3" style={{ background: "rgba(232,165,165,0.1)" }}>
                        <p className="text-[10px] font-bold text-latte-400 uppercase tracking-wide mb-0.5">💪 You Got This</p>
                        <p className="text-xs text-latte-600 leading-relaxed">{plan.motivation}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── AI Loading shimmer ───────────────────────────────────────
function AiLoadingCard() {
    return (
        <div className="rounded-3xl overflow-hidden border border-latte-200/60 p-4 space-y-3" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,232,232,0.5) 100%)",
        }}>
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-latte-400 animate-pulse" />
                <p className="text-xs font-bold text-latte-400 uppercase tracking-wider">AI is thinking...</p>
            </div>
            <div className="h-4 rounded-xl shimmer w-4/5" />
            <div className="space-y-2">
                <div className="h-3 rounded-xl shimmer w-full" />
                <div className="h-3 rounded-xl shimmer w-5/6" />
                <div className="h-3 rounded-xl shimmer w-4/6" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-14 rounded-2xl shimmer" />
                <div className="h-14 rounded-2xl shimmer" />
            </div>
        </div>
    );
}

// ── Main Modal ───────────────────────────────────────────────
export default function TaskModal({ open, classId, existing, classes, onClose, onCreate, onUpdate }: TaskModalProps) {
    const [form, setForm] = useState({ ...emptyForm });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const isEdit = !!existing;

    useEffect(() => {
        if (open) {
            setForm(existing ? {
                class_id: existing.class_id,
                title: existing.title,
                description: existing.description ?? "",
                due_date: existing.due_date,
                status: existing.status,
            } : { ...emptyForm, class_id: classId ?? classes[0]?.id ?? "" });
            setError("");
            setAiPlan(existing?.ai_plan ?? null);
            setAiError("");
        }
    }, [open, existing, classId, classes]);

    async function handleAiPlan() {
        if (!form.title.trim()) return;
        setAiLoading(true);
        setAiError("");
        setAiPlan(null);
        try {
            const plan = await generateTaskPlan(form.title.trim(), form.description.trim());
            setAiPlan(plan);
        } catch (e: unknown) {
            setAiError(e instanceof Error ? e.message : "Gagal menghubungi AI. Coba lagi.");
        } finally {
            setAiLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) { setError("Title is required"); return; }
        if (!form.due_date) { setError("Due date is required"); return; }
        if (!form.class_id) { setError("Please select a class"); return; }
        setLoading(true);
        setError("");
        try {
            const data = {
                class_id: form.class_id,
                title: form.title.trim(),
                description: form.description.trim() || null,
                due_date: form.due_date,
                status: form.status,
                ai_plan: aiPlan,
            };
            if (isEdit && existing) {
                await onUpdate(existing.id, data);
            } else {
                await onCreate(data);
            }
            onClose();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" style={{ padding: '0 16px' }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-lg bg-white rounded-4xl shadow-glass-lg modal-content flex flex-col"
                style={{ maxHeight: '88dvh' }}
            >
                {/* Header */}
                <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg font-bold text-latte-700">{isEdit ? "Edit Task" : "Add Task"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-latte-50 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <form
                    id="task-form"
                    onSubmit={handleSubmit}
                    className="px-5 pb-4 space-y-4 overflow-y-auto flex-1"
                >
                    {/* Class */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Class *</label>
                        <select
                            value={form.class_id}
                            onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                        >
                            <option value="">Select class...</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.subject}</option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Chapter 4 Assignment"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Notes</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Any notes..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300 resize-none"
                        />
                    </div>

                    {/* AI Plan Button */}
                    <button
                        type="button"
                        onClick={handleAiPlan}
                        disabled={!form.title.trim() || aiLoading}
                        className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            background: "linear-gradient(135deg, rgba(200,169,126,0.15) 0%, rgba(232,165,165,0.15) 100%)",
                            border: "1px solid rgba(200,169,126,0.3)",
                            color: "#b8966a"
                        }}
                    >
                        {aiLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating plan...</>
                            : <><Sparkles className="w-4 h-4" /> Rencana AI ✨</>
                        }
                    </button>

                    {/* AI Error */}
                    {aiError && (
                        <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2 border border-rose-100">
                            ⚠️ {aiError}
                        </p>
                    )}

                    {/* AI Loading Shimmer */}
                    {aiLoading && <AiLoadingCard />}

                    {/* AI Magic Card Result */}
                    {aiPlan && !aiLoading && <AiPlanCard plan={aiPlan} />}

                    {/* Due date & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Due Date *</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Status</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as Task["status"] })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done ✓</option>
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                </form>

                {/* Sticky Save Button */}
                <div className="px-5 pb-6 pt-3 border-t border-latte-100 bg-white flex-shrink-0">
                    <button
                        type="submit"
                        form="task-form"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl bg-latte-400 hover:bg-latte-500 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}
