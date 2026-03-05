"use client";

import { useAppData } from "@/hooks/useAppData";
import ExamModal from "@/components/modals/ExamModal";
import { useState } from "react";
import { GraduationCap, Plus, Trash2, CalendarCheck } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { Exam } from "@/lib/types";

export default function ExamsPage() {
    const { classes, loading, addExam, updateExam, deleteExam } = useAppData();
    const [examModal, setExamModal] = useState<{ open: boolean; data?: Exam; classId?: string }>({ open: false });

    const allExams = classes.flatMap((c) =>
        (c.exams ?? []).map((e) => ({ ...e, className: c.subject, classColor: c.color_code }))
    ).sort((a, b) => a.exam_date.localeCompare(b.exam_date));

    const upcoming = allExams.filter((e) => !isPast(parseISO(e.exam_date)) || isToday(parseISO(e.exam_date)));
    const past = allExams.filter((e) => isPast(parseISO(e.exam_date)) && !isToday(parseISO(e.exam_date)));

    function getCountdown(dateStr: string) {
        const d = parseISO(dateStr);
        if (isToday(d)) return { label: "Today!", color: "text-red-500 font-bold" };
        if (isTomorrow(d)) return { label: "Tomorrow", color: "text-orange-500 font-semibold" };
        const days = differenceInDays(d, new Date());
        if (days <= 7) return { label: `${days}d left`, color: "text-amber-500 font-medium" };
        return { label: format(d, "MMM d"), color: "text-latte-400" };
    }

    return (
        <div className="min-h-screen latte-gradient-card">
            <header className="px-5 pt-14 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-latte-400" strokeWidth={1.5} />
                        <h1 className="text-xl font-bold text-latte-700">Exams</h1>
                    </div>
                    <button
                        onClick={() => setExamModal({ open: true })}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-latte-400 text-white text-xs font-semibold shadow-soft hover:bg-latte-500 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Exam
                    </button>
                </div>
                <p className="text-sm text-latte-400 mt-1">{upcoming.length} upcoming</p>
            </header>

            <div className="px-5 pb-safe space-y-5" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
                {loading && <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 rounded-3xl shimmer" />)}</div>}

                {!loading && allExams.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🎓</p>
                        <p className="font-semibold text-latte-600 mb-1">No exams added</p>
                        <p className="text-sm text-latte-400">Track your upcoming exams to stay prepared.</p>
                    </div>
                )}

                {/* Upcoming */}
                {upcoming.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-2">Upcoming</p>
                        <div className="space-y-3">
                            {upcoming.map((exam) => {
                                const countdown = getCountdown(exam.exam_date);
                                return (
                                    <div key={exam.id} className="glass-card rounded-3xl p-4" style={{ borderLeft: `4px solid ${exam.classColor}` }}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-latte-700 truncate">{exam.title}</p>
                                                <p className="text-xs text-latte-400 mt-0.5">{exam.className}</p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                    <span className={`text-sm ${countdown.color}`}>{countdown.label}</span>
                                                    {exam.exam_time && <span className="text-xs text-latte-400">at {exam.exam_time.slice(0, 5)}</span>}
                                                    {exam.room_location && <span className="text-xs text-latte-400">📍 {exam.room_location}</span>}
                                                </div>
                                                {exam.notes && <p className="text-xs text-latte-300 mt-1.5 italic">{exam.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button onClick={() => setExamModal({ open: true, data: exam })} className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-200 hover:text-latte-500 hover:bg-latte-50 transition-all active:scale-90">
                                                    <CalendarCheck className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => deleteExam(exam.id)} className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-200 hover:text-red-400 hover:bg-red-50 transition-all active:scale-90">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Past */}
                {past.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-latte-300 uppercase tracking-wide mb-2">Past Exams</p>
                        <div className="space-y-2">
                            {past.map((exam) => (
                                <div key={exam.id} className="rounded-2xl px-4 py-3 bg-latte-50 border border-latte-100 opacity-60 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-latte-500 font-medium line-through">{exam.title}</p>
                                        <p className="text-xs text-latte-300">{exam.className} · {format(parseISO(exam.exam_date), "MMM d")}</p>
                                    </div>
                                    <button onClick={() => deleteExam(exam.id)} className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-200 hover:text-red-400 hover:bg-red-50 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <ExamModal open={examModal.open} classId={examModal.classId} existing={examModal.data} classes={classes} onClose={() => setExamModal({ open: false })} onCreate={addExam} onUpdate={updateExam} />
        </div>
    );
}
