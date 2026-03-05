"use client";

import { useState, useEffect } from "react";
import { Task, ClassWithRelations } from "@/lib/types";
import { X, Loader2 } from "lucide-react";

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

export default function TaskModal({ open, classId, existing, classes, onClose, onCreate, onUpdate }: TaskModalProps) {
    const [form, setForm] = useState({ ...emptyForm });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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
        }
    }, [open, existing, classId, classes]);

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
                style={{ maxHeight: '85dvh' }}
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

                {/* Sticky Save Button — always visible */}
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
