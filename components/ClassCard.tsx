"use client";

import { useState } from "react";
import { ClassWithRelations, DAY_NAMES_SHORT } from "@/lib/types";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import {
    Clock, MapPin, ChevronDown, ChevronUp, BookOpen,
    ClipboardList, GraduationCap, Plus, Pencil, Trash2,
} from "lucide-react";

interface ClassCardProps {
    cls: ClassWithRelations;
    onEdit: (cls: ClassWithRelations) => void;
    onDelete: (id: string) => void;
    onAddTask: (classId: string) => void;
    onAddExam: (classId: string) => void;
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

export default function ClassCard({
    cls, onEdit, onDelete, onAddTask, onAddExam,
}: ClassCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const pendingTasks = cls.tasks?.filter((t) => t.status !== "done") ?? [];
    const upcomingExams = cls.exams ?? [];
    const dayName = DAY_NAMES_SHORT[cls.day_of_week] ?? "?";

    return (
        <div
            className="glass-card rounded-3xl overflow-hidden transition-all duration-300 animate-fade-in"
            style={{ borderLeft: `4px solid ${cls.color_code}` }}
        >
            {/* ── Main Card Header ─────────────────────────────── */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                        {/* Color dot */}
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: hexToRgba(cls.color_code, 0.15) }}
                        >
                            <BookOpen
                                className="w-5 h-5"
                                style={{ color: cls.color_code }}
                                strokeWidth={1.5}
                            />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-latte-700 text-base leading-snug truncate">
                                {cls.subject}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                <span className="flex items-center gap-1 text-xs text-latte-400">
                                    <Clock className="w-3 h-3" />
                                    {dayName} · {formatTime(cls.start_time)}–{formatTime(cls.end_time)}
                                </span>
                                {cls.room && (
                                    <span className="flex items-center gap-1 text-xs text-latte-400">
                                        <MapPin className="w-3 h-3" />
                                        {cls.room}
                                    </span>
                                )}
                            </div>
                            {cls.lecturer && (
                                <p className="text-xs text-latte-300 mt-1">👩‍🏫 {cls.lecturer}</p>
                            )}
                        </div>
                    </div>

                    {/* Right: action dots + expand */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Quick action menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowActions((v) => !v)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-300 hover:text-latte-500 hover:bg-latte-50 transition-all active:scale-90"
                                aria-label="Actions"
                            >
                                <span className="text-base leading-none font-bold tracking-tighter">···</span>
                            </button>
                            {showActions && (
                                <div className="absolute right-0 top-9 w-36 glass-card rounded-2xl shadow-glass-lg z-20 overflow-hidden animate-scale-in">
                                    <button
                                        onClick={() => { onEdit(cls); setShowActions(false); }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-latte-600 hover:bg-latte-50 transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => { onAddTask(cls.id); setShowActions(false); }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-latte-600 hover:bg-latte-50 transition-colors"
                                    >
                                        <ClipboardList className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                    <button
                                        onClick={() => { onAddExam(cls.id); setShowActions(false); }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-latte-600 hover:bg-latte-50 transition-colors"
                                    >
                                        <GraduationCap className="w-3.5 h-3.5" /> Add Exam
                                    </button>
                                    <div className="border-t border-latte-100 my-0.5" />
                                    <button
                                        onClick={() => { onDelete(cls.id); setShowActions(false); }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Expand toggle */}
                        {(pendingTasks.length > 0 || upcomingExams.length > 0) && (
                            <button
                                onClick={() => setExpanded((v) => !v)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-latte-300 hover:text-latte-500 hover:bg-latte-50 transition-all active:scale-90"
                            >
                                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Pill badges */}
                {(pendingTasks.length > 0 || upcomingExams.length > 0) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {pendingTasks.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-latte-100 text-latte-500 font-medium">
                                <ClipboardList className="w-3 h-3" />
                                {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""}
                            </span>
                        )}
                        {upcomingExams.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-soft text-rose-muted font-medium"
                                style={{ backgroundColor: "#f9e8e8", color: "#c9a5a5" }}>
                                <GraduationCap className="w-3 h-3" />
                                {upcomingExams.length} exam{upcomingExams.length > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Expanded: Tasks & Exams ───────────────────────── */}
            {expanded && (
                <div className="border-t border-latte-100 px-5 py-4 space-y-4 animate-slide-down">
                    {/* Tasks */}
                    {pendingTasks.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-latte-400 uppercase tracking-wide">Tasks</p>
                                <button
                                    onClick={() => onAddTask(cls.id)}
                                    className="flex items-center gap-1 text-xs text-latte-400 hover:text-latte-600 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {pendingTasks.map((task) => {
                                    const badge = getDueBadge(task.due_date);
                                    return (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl"
                                            style={{ backgroundColor: hexToRgba(cls.color_code, 0.06) }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: cls.color_code }}
                                                />
                                                <span className="text-sm text-latte-600 truncate">{task.title}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Exams */}
                    {upcomingExams.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-latte-400 uppercase tracking-wide">Exams</p>
                                <button
                                    onClick={() => onAddExam(cls.id)}
                                    className="flex items-center gap-1 text-xs text-latte-400 hover:text-latte-600 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {upcomingExams.map((exam) => (
                                    <div
                                        key={exam.id}
                                        className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl"
                                        style={{ backgroundColor: "#fdf3f3" }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <GraduationCap className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" strokeWidth={1.5} />
                                            <span className="text-sm text-latte-600 truncate">{exam.title}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-rose-400 font-medium">
                                                {format(parseISO(exam.exam_date), "MMM d")}
                                            </p>
                                            {exam.room_location && (
                                                <p className="text-xs text-latte-300">{exam.room_location}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
