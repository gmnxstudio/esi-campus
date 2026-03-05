"use client";

import { useState, useEffect } from "react";
import { Class, ClassWithRelations, DAY_NAMES, CLASS_COLORS } from "@/lib/types";
import { X, Loader2 } from "lucide-react";

interface ClassModalProps {
    open: boolean;
    existing?: ClassWithRelations;
    onClose: () => void;
    onCreate: (data: Omit<Class, "id" | "created_at" | "updated_at">) => Promise<void>;
    onUpdate: (id: string, data: Partial<Class>) => Promise<void>;
}

const empty = {
    subject: "",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "10:00",
    room: "",
    lecturer: "",
    color_code: "#c8a97e",
};

export default function ClassModal({ open, existing, onClose, onCreate, onUpdate }: ClassModalProps) {
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const isEdit = !!existing;

    useEffect(() => {
        if (open) {
            setForm(existing ? {
                subject: existing.subject,
                day_of_week: existing.day_of_week,
                start_time: existing.start_time.slice(0, 5),
                end_time: existing.end_time.slice(0, 5),
                room: existing.room ?? "",
                lecturer: existing.lecturer ?? "",
                color_code: existing.color_code,
            } : empty);
            setError("");
        }
    }, [open, existing]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.subject.trim()) { setError("Subject name is required"); return; }
        setLoading(true);
        setError("");
        try {
            const data = {
                subject: form.subject.trim(),
                day_of_week: Number(form.day_of_week),
                start_time: form.start_time,
                end_time: form.end_time,
                room: form.room.trim() || null,
                lecturer: form.lecturer.trim() || null,
                color_code: form.color_code,
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
                    <h2 className="text-lg font-bold text-latte-700">{isEdit ? "Edit Class" : "Add Class"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-latte-50 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <form
                    id="class-form"
                    onSubmit={handleSubmit}
                    className="px-5 pb-4 space-y-4 overflow-y-auto flex-1"
                >
                    {/* Subject */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Subject *</label>
                        <input
                            type="text"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            placeholder="e.g. Calculus II"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Day */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Day</label>
                        <select
                            value={form.day_of_week}
                            onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                        >
                            {DAY_NAMES.map((name, i) => (
                                <option key={i} value={i}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Start Time</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">End Time</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400"
                            />
                        </div>
                    </div>

                    {/* Room */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Room</label>
                        <input
                            type="text"
                            value={form.room}
                            onChange={(e) => setForm({ ...form, room: e.target.value })}
                            placeholder="e.g. Room 3B / Online"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Lecturer */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-1.5 block">Lecturer</label>
                        <input
                            type="text"
                            value={form.lecturer}
                            onChange={(e) => setForm({ ...form, lecturer: e.target.value })}
                            placeholder="e.g. Dr. Sarah Kim"
                            className="w-full px-4 py-3 rounded-2xl bg-latte-50 border border-latte-200 text-latte-700 text-sm focus:outline-none focus:ring-2 focus:ring-latte-400 placeholder-latte-300"
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-2 block">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {CLASS_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, color_code: c.value })}
                                    className={`w-8 h-8 rounded-full transition-all active:scale-90 ${form.color_code === c.value ? "ring-2 ring-offset-2 ring-latte-400 scale-110" : ""}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                </form>

                {/* Sticky Save Button — always visible */}
                <div className="px-5 pb-6 pt-3 border-t border-latte-100 bg-white flex-shrink-0">
                    <button
                        type="submit"
                        form="class-form"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl bg-latte-400 hover:bg-latte-500 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Class"}
                    </button>
                </div>
            </div>
        </div>
    );
}
