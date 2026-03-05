"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, BookOpen, Sparkles, Bell } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { ClassWithRelations, DAY_NAMES, Class, Task, Exam } from "@/lib/types";
import ClassCard from "@/components/ClassCard";
import ClassModal from "@/components/modals/ClassModal";
import TaskModal from "@/components/modals/TaskModal";
import ExamModal from "@/components/modals/ExamModal";
import NotificationBanner from "@/components/NotificationBanner";

export default function DashboardPage() {
    const {
        classes, loading, error, refresh,
        addClass, updateClass, deleteClass,
        addTask, updateTask, deleteTask,
        addExam, updateExam, deleteExam,
    } = useAppData();

    const [greeting, setGreeting] = useState("Good morning");
    const [classModal, setClassModal] = useState<{ open: boolean; data?: ClassWithRelations }>({ open: false });
    const [taskModal, setTaskModal] = useState<{ open: boolean; classId?: string; data?: Task }>({ open: false });
    const [examModal, setExamModal] = useState<{ open: boolean; classId?: string; data?: Exam }>({ open: false });
    const [showNotifBanner, setShowNotifBanner] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const today = new Date();
    const todayDow = today.getDay();

    useEffect(() => {
        const hour = today.getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 17) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        // Show notification banner if not granted
        if ("Notification" in window && Notification.permission === "default") {
            setTimeout(() => setShowNotifBanner(true), 2000);
        }
    }, []);

    const todayClasses = classes.filter((c) => c.day_of_week === todayDow);
    const otherClasses = classes.filter((c) => c.day_of_week !== todayDow);

    // Sort other classes starting from tomorrow
    const sortedOtherClasses = [...otherClasses].sort((a, b) => {
        const aDiff = (a.day_of_week - todayDow + 7) % 7;
        const bDiff = (b.day_of_week - todayDow + 7) % 7;
        return aDiff - bDiff || a.start_time.localeCompare(b.start_time);
    });

    async function handleDeleteClass(id: string) {
        if (!confirm("Delete this class and all its tasks/exams?")) return;
        setDeleting(id);
        try { await deleteClass(id); } catch { }
        setDeleting(null);
    }

    return (
        <div className="min-h-screen latte-gradient-card">
            {/* ── Header ─────────────────────────────────────────── */}
            <header className="px-5 pt-safe pb-0" style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}>
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <p className="text-sm text-latte-400 font-medium">
                            {format(today, "EEEE, MMMM d")} 🌸
                        </p>
                        <h1 className="text-2xl font-bold text-latte-700 mt-0.5 tracking-tight">
                            {greeting}, Praishe!
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowNotifBanner(true)}
                            className="w-9 h-9 rounded-2xl glass flex items-center justify-center text-latte-400 hover:text-latte-600 transition-all active:scale-90 shadow-soft"
                        >
                            <Bell className="w-4.5 h-4.5" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Summary pills */}
                <div className="flex gap-2 mt-4 mb-5">
                    <div className="glass-card rounded-2xl px-4 py-2.5 flex items-center gap-2 flex-1">
                        <BookOpen className="w-4 h-4 text-latte-400" strokeWidth={1.5} />
                        <div>
                            <p className="text-xs text-latte-400 font-medium">Classes today</p>
                            <p className="text-lg font-bold text-latte-600">{todayClasses.length}</p>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl px-4 py-2.5 flex items-center gap-2 flex-1">
                        <Sparkles className="w-4 h-4 text-latte-400" strokeWidth={1.5} />
                        <div>
                            <p className="text-xs text-latte-400 font-medium">Total classes</p>
                            <p className="text-lg font-bold text-latte-600">{classes.length}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Content ────────────────────────────────────────── */}
            <div className="px-5 pb-safe space-y-6" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>

                {/* Notification banner */}
                {showNotifBanner && (
                    <NotificationBanner onDismiss={() => setShowNotifBanner(false)} />
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-500">
                        {error} — <button onClick={refresh} className="underline font-medium">Retry</button>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 rounded-3xl shimmer" />
                        ))}
                    </div>
                )}

                {/* Today's Classes */}
                {!loading && (
                    <>
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-latte-500 uppercase tracking-wider">
                                    {DAY_NAMES[todayDow]} · Today
                                </h2>
                            </div>

                            {todayClasses.length === 0 ? (
                                <div className="glass-card rounded-3xl p-6 text-center">
                                    <p className="text-2xl mb-2">🎉</p>
                                    <p className="text-sm text-latte-400 font-medium">No classes today — enjoy your free time!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todayClasses.map((cls) => (
                                        <ClassCard
                                            key={cls.id}
                                            cls={cls}
                                            onEdit={(c) => setClassModal({ open: true, data: c })}
                                            onDelete={handleDeleteClass}
                                            onAddTask={(cid) => setTaskModal({ open: true, classId: cid })}
                                            onAddExam={(cid) => setExamModal({ open: true, classId: cid })}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Upcoming Classes */}
                        {sortedOtherClasses.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-latte-500 uppercase tracking-wider mb-3">
                                    Upcoming Classes
                                </h2>
                                <div className="space-y-3">
                                    {sortedOtherClasses.map((cls) => (
                                        <ClassCard
                                            key={cls.id}
                                            cls={cls}
                                            onEdit={(c) => setClassModal({ open: true, data: c })}
                                            onDelete={handleDeleteClass}
                                            onAddTask={(cid) => setTaskModal({ open: true, classId: cid })}
                                            onAddExam={(cid) => setExamModal({ open: true, classId: cid })}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Empty state — no classes at all */}
                        {classes.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4">📚</div>
                                <h3 className="font-semibold text-latte-600 text-lg mb-2">No classes yet</h3>
                                <p className="text-sm text-latte-400 mb-6">
                                    Add your first class to get started with your schedule!
                                </p>
                                <button
                                    onClick={() => setClassModal({ open: true })}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-latte-400 text-white font-semibold text-sm shadow-soft hover:bg-latte-500 transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> Add Your First Class
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── FAB ─────────────────────────────────────────────── */}
            <button
                onClick={() => setClassModal({ open: true })}
                className="fixed right-5 w-14 h-14 rounded-2xl bg-latte-400 hover:bg-latte-500 text-white shadow-glass-lg flex items-center justify-center transition-all active:scale-90 z-40"
                style={{ bottom: `calc(5.5rem + env(safe-area-inset-bottom, 0px))` }}
                aria-label="Add class"
            >
                <Plus className="w-6 h-6" strokeWidth={2} />
            </button>

            {/* ── Modals ──────────────────────────────────────────── */}
            <ClassModal
                open={classModal.open}
                existing={classModal.data}
                onClose={() => setClassModal({ open: false })}
                onCreate={addClass}
                onUpdate={updateClass}
            />
            <TaskModal
                open={taskModal.open}
                classId={taskModal.classId}
                existing={taskModal.data}
                classes={classes}
                onClose={() => setTaskModal({ open: false })}
                onCreate={addTask}
                onUpdate={updateTask}
            />
            <ExamModal
                open={examModal.open}
                classId={examModal.classId}
                existing={examModal.data}
                classes={classes}
                onClose={() => setExamModal({ open: false })}
                onCreate={addExam}
                onUpdate={updateExam}
            />
        </div>
    );
}
