"use client";

import { useState } from "react";
import { ClassWithRelations, Task, Exam, DAY_NAMES } from "@/lib/types";
import { format, parseISO, isPast, isToday, isTomorrow } from "date-fns";
import {
    X, Clock, MapPin, ClipboardList, GraduationCap,
    Plus, Pencil, Trash2, BookOpen, CheckCircle2, Circle,
} from "lucide-react";

interface ClassDetailModalProps {
    cls: ClassWithRelations;
    open: boolean;
    onClose: () => void;
    onEdit: (cls: ClassWithRelations) => void;
    onDelete: (id: string) => void;
    onAddTask: (classId: string) => void;
    onAddExam: (classId: string) => void;
    onUpdateTask: (id: string, data: Partial<Task>) => Promise<void>;
    onDeleteTask: (id: string) => Promise<void>;
    onDeleteExam: (id: string) => Promise<void>;
}

function formatTime(time: string): string {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getDueBadge(dateStr: string) {
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return { label: "Overdue", color: "bg-red-100 text-red-500" };
    if (isToday(date)) return { label: "Due Today", color: "bg-orange-100 text-orange-500" };
    if (isTomorrow(date)) return { label: "Tomorrow", color: "bg-amber-100 text-amber-600" };
    return { label: format(date, "MMM d"), color: "bg-latte-100 text-latte-500" };
}

export default function ClassDetailModal({
    cls, open, onClose, onEdit, onDelete,
    onAddTask, onAddExam, onUpdateTask, onDeleteTask, onDeleteExam,
}: ClassDetailModalProps) {
    const [tab, setTab] = useState<"tasks" | "exams">("tasks");
    const [deletingTask, setDeletingTask] = useState<string | null>(null);
    const [deletingExam, setDeletingExam] = useState<string | null>(null);

    if (!open) return null;

    const tasks = cls.tasks ?? [];
    const exams = cls.exams ?? [];
    const pendingTasks = tasks.filter(t => t.status !== "done");
    const doneTasks = tasks.filter(t => t.status === "done");

    async function toggleTask(task: Task) {
        const nextStatus = task.status === "done" ? "pending" : "done";
        await onUpdateTask(task.id, { status: nextStatus });
    }

    async function handleDeleteTask(id: string) {
        if (!confirm("Delete this task?")) return;
        setDeletingTask(id);
        try { await onDeleteTask(id); } finally { setDeletingTask(null); }
    }

    async function handleDeleteExam(id: string) {
        if (!confirm("Delete this exam?")) return;
        setDeletingExam(id);
        try { await onDeleteExam(id); } finally { setDeletingExam(null); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" style={{ padding: "0 16px" }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-lg bg-white rounded-4xl shadow-glass-lg flex flex-col"
                style={{ maxHeight: "85dvh" }}
            >
                {/* ── Header ────────────────────────────────────────── */}
                <div
                    className="px-5 pt-5 pb-4 rounded-t-4xl flex-shrink-0"
                    style={{ background: hexToRgba(cls.color_code, 0.08) }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 items-center flex-1 min-w-0">
                            <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: hexToRgba(cls.color_code, 0.2) }}
                            >
                                <BookOpen className="w-5 h-5" style={{ color: cls.color_code }} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-latte-700 text-base leading-snug">{cls.subject}</h2>
                                <p className="text-xs text-latte-400 mt-0.5">{DAY_NAMES[cls.day_of_week]}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => { onEdit(cls); onClose(); }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-400 hover:bg-white/60 transition-all"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => { onDelete(cls.id); onClose(); }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-red-300 hover:bg-red-50 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-300 hover:bg-white/60 transition-all ml-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                        <span className="flex items-center gap-1.5 text-xs text-latte-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                        </span>
                        {cls.room && (
                            <span className="flex items-center gap-1.5 text-xs text-latte-400">
                                <MapPin className="w-3 h-3" />
                                {cls.room}
                            </span>
                        )}
                        {cls.lecturer && (
                            <span className="text-xs text-latte-400">👩‍🏫 {cls.lecturer}</span>
                        )}
                    </div>
                </div>

                {/* ── Tabs ──────────────────────────────────────────── */}
                <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0">
                    <button
                        onClick={() => setTab("tasks")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "tasks"
                            ? "bg-latte-100 text-latte-600"
                            : "text-latte-300 hover:text-latte-500"
                            }`}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tasks
                        {tasks.length > 0 && (
                            <span className="text-xs bg-latte-200 text-latte-500 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {tasks.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab("exams")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "exams"
                            ? "bg-rose-50 text-rose-400"
                            : "text-latte-300 hover:text-latte-500"
                            }`}
                    >
                        <GraduationCap className="w-3.5 h-3.5" />
                        Exams
                        {exams.length > 0 && (
                            <span className="text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                                style={{ backgroundColor: "#fde8e8", color: "#c9a5a5" }}>
                                {exams.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Body (scrollable) ─────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-3">

                    {/* TASKS TAB */}
                    {tab === "tasks" && (
                        <div className="space-y-2">
                            {tasks.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-3xl mb-2">📋</p>
                                    <p className="text-sm text-latte-300">No tasks yet</p>
                                </div>
                            ) : (
                                <>
                                    {/* Pending */}
                                    {pendingTasks.map(task => {
                                        const badge = getDueBadge(task.due_date);
                                        return (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                                                style={{ backgroundColor: hexToRgba(cls.color_code, 0.06) }}
                                            >
                                                <button
                                                    onClick={() => toggleTask(task)}
                                                    className="flex-shrink-0 text-latte-300 hover:text-latte-500 transition-colors"
                                                >
                                                    <Circle className="w-4.5 h-4.5" strokeWidth={1.5} />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-latte-700 font-medium truncate">{task.title}</p>
                                                    {task.description && (
                                                        <p className="text-xs text-latte-300 truncate mt-0.5">{task.description}</p>
                                                    )}
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    disabled={deletingTask === task.id}
                                                    className="flex-shrink-0 text-latte-200 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {/* Done */}
                                    {doneTasks.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-latte-300 uppercase tracking-wide font-semibold mb-2 px-1">Done</p>
                                            {doneTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl opacity-60"
                                                >
                                                    <button
                                                        onClick={() => toggleTask(task)}
                                                        className="flex-shrink-0 text-green-400 transition-colors"
                                                    >
                                                        <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={1.5} />
                                                    </button>
                                                    <p className="text-sm text-latte-400 line-through truncate flex-1">{task.title}</p>
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="flex-shrink-0 text-latte-200 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* EXAMS TAB */}
                    {tab === "exams" && (
                        <div className="space-y-2">
                            {exams.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-3xl mb-2">🎓</p>
                                    <p className="text-sm text-latte-300">No exams yet</p>
                                </div>
                            ) : (
                                exams.map(exam => (
                                    <div
                                        key={exam.id}
                                        className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                                        style={{ backgroundColor: "#fdf3f3" }}
                                    >
                                        <GraduationCap className="w-4 h-4 text-rose-300 flex-shrink-0" strokeWidth={1.5} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-latte-700 font-medium truncate">{exam.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-xs text-rose-400 font-medium">
                                                    {format(parseISO(exam.exam_date), "EEEE, MMM d")}
                                                </span>
                                                {exam.exam_time && (
                                                    <span className="text-xs text-latte-300">· {formatTime(exam.exam_time)}</span>
                                                )}
                                                {exam.room_location && (
                                                    <span className="text-xs text-latte-300">· {exam.room_location}</span>
                                                )}
                                            </div>
                                            {exam.notes && (
                                                <p className="text-xs text-latte-300 mt-0.5 truncate">{exam.notes}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExam(exam.id)}
                                            disabled={deletingExam === exam.id}
                                            className="flex-shrink-0 text-latte-200 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Sticky Add Button ─────────────────────────────── */}
                <div className="px-5 pb-5 pt-3 border-t border-latte-100 flex-shrink-0">
                    <button
                        onClick={() => {
                            if (tab === "tasks") { onAddTask(cls.id); onClose(); }
                            else { onAddExam(cls.id); onClose(); }
                        }}
                        className="w-full py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        style={{ backgroundColor: tab === "tasks" ? cls.color_code : "#e8a5a5" }}
                    >
                        <Plus className="w-4 h-4" />
                        {tab === "tasks" ? "Add Task" : "Add Exam"}
                    </button>
                </div>
            </div>
        </div>
    );
}
