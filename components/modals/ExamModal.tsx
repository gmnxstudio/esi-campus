"use client";

import { useState, useEffect } from "react";
import { Exam, ClassWithRelations } from "@/lib/types";
import { X, Loader2 } from "lucide-react";

interface ExamModalProps {
    open: boolean;
    classId?: string;
    existing?: Exam;
    classes: ClassWithRelations[];
    onClose: () => void;
    onCreate: (data: Omit<Exam, "id" | "created_at" | "updated_at">) => Promise<void>;
    onUpdate: (id: string, data: Partial<Exam>) => Promise<void>;
}

const emptyForm = {
    class_id: "",
    title: "",
    exam_date: "",
    exam_time: "",
    room_location: "",
    notes: "",
};

export default function ExamModal({ open, classId, existing, classes, onClose, onCreate, onUpdate }: ExamModalProps) {
    const [form, setForm] = useState({ ...emptyForm });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const isEdit = !!existing;

    useEffect(() => {
        if (open) {
            setForm(existing ? {
                class_id: existing.class_id,
                title: existing.title,
                exam_date: existing.exam_date,
                exam_time: existing.exam_time ?? "",
                room_location: existing.room_location ?? "",
                notes: existing.notes ?? "",
            } : { ...emptyForm, class_id: classId ?? classes[0]?.id ?? "" });
            setError("");
        }
    }, [open, existing, classId, classes]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) { setError("Title is required"); return; }
        if (!form.exam_date) { setError("Exam date is required"); return; }
        if (!form.class_id) { setError("Please select a class"); return; }
        setLoading(true);
        setError("");
        try {
            const data = {
                class_id: form.class_id,
                title: form.title.trim(),
                exam_date: form.exam_date,
                exam_time: form.exam_time || null,
                room_location: form.room_location.trim() || null,
                notes: form.notes.trim() || null,
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
                    <h2 className="text-lg font-bold text-latte-700">{isEdit ? "Edit Exam" : "Add Exam"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-latte-50 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <form
                    id="exam-form"
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
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Exam Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Midterm Exam — Chapter 1-5"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Date *</label>
                            <input
                                type="date"
                                value={form.exam_date}
                                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Time</label>
                            <input
                                type="time"
                                value={form.exam_time}
                                onChange={(e) => setForm({ ...form, exam_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            />
                        </div>
                    </div>

                    {/* Room */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Room / Location</label>
                        <input
                            type="text"
                            value={form.room_location}
                            onChange={(e) => setForm({ ...form, room_location: e.target.value })}
                            placeholder="e.g. Hall A / Online"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Notes</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Topics covered, special materials..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300 resize-none"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                </form>

                {/* Sticky Save Button — always visible */}
                <div className="px-5 pb-6 pt-3 border-t border-latte-100 bg-white flex-shrink-0">
                    <button
                        type="submit"
                        form="exam-form"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl bg-latte-400 hover:bg-latte-500 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Exam"}
                    </button>
                </div>
            </div>
        </div>
    );
}
