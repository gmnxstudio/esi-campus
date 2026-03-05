"use client";

import { useAppData } from "@/hooks/useAppData";
import TaskModal from "@/components/modals/TaskModal";
import { useState } from "react";
import { CheckSquare, Plus, Trash2, CheckCircle } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { Task } from "@/lib/types";

function StatusBadge({ status }: { status: Task["status"] }) {
    const map = {
        pending: "bg-amber-50 text-amber-500 border border-amber-100",
        in_progress: "bg-blue-50 text-blue-500 border border-blue-100",
        done: "bg-green-50 text-green-500 border border-green-100",
    };
    const labels = { pending: "Pending", in_progress: "In Progress", done: "Done ✓" };
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status]}`}>
            {labels[status]}
        </span>
    );
}

export default function TasksPage() {
    const { classes, loading, addTask, updateTask, deleteTask } = useAppData();
    const [taskModal, setTaskModal] = useState<{ open: boolean; data?: Task; classId?: string }>({ open: false });

    const allTasks = classes.flatMap((c) => (c.tasks ?? []).map((t) => ({ ...t, className: c.subject, classColor: c.color_code })));
    const pending = allTasks.filter((t) => t.status !== "done").sort((a, b) => a.due_date.localeCompare(b.due_date));
    const done = allTasks.filter((t) => t.status === "done");

    function getDueLabel(date: string) {
        const d = parseISO(date);
        if (isPast(d) && !isToday(d)) return { label: "Overdue", color: "text-red-500" };
        if (isToday(d)) return { label: "Today", color: "text-orange-500" };
        if (isTomorrow(d)) return { label: "Tomorrow", color: "text-amber-500" };
        return { label: format(d, "MMM d"), color: "text-latte-400" };
    }

    async function toggleDone(task: Task & { className: string; classColor: string }) {
        await updateTask(task.id, { status: task.status === "done" ? "pending" : "done" });
    }

    return (
        <div className="min-h-screen latte-gradient-card">
            <header className="px-5 pt-14 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-latte-400" strokeWidth={1.5} />
                        <h1 className="text-xl font-bold text-latte-700">Tasks</h1>
                    </div>
                    <button
                        onClick={() => setTaskModal({ open: true })}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-latte-400 text-white text-xs font-semibold shadow-soft hover:bg-latte-500 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Task
                    </button>
                </div>
                <p className="text-sm text-latte-400 mt-1">{pending.length} pending · {done.length} done</p>
            </header>

            <div className="px-5 pb-safe space-y-5" style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
                {loading && <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}</div>}

                {!loading && pending.length === 0 && done.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">✅</p>
                        <p className="font-semibold text-latte-600 mb-1">All clear!</p>
                        <p className="text-sm text-latte-400">No tasks yet. Add one to stay on track.</p>
                    </div>
                )}

                {/* Pending Tasks */}
                {pending.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-latte-400 uppercase tracking-wide mb-2">Outstanding</p>
                        <div className="space-y-2">
                            {pending.map((task) => {
                                const due = getDueLabel(task.due_date);
                                return (
                                    <div key={task.id} className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${task.classColor}` }}>
                                        <button onClick={() => toggleDone(task)} className="w-6 h-6 rounded-full border-2 border-latte-200 flex-shrink-0 flex items-center justify-center hover:border-latte-400 transition-all active:scale-90">
                                            <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-latte-700 truncate">{task.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-latte-300">{task.className}</span>
                                                <span className={`text-xs font-medium ${due.color}`}>· {due.label}</span>
                                            </div>
                                        </div>
                                        <StatusBadge status={task.status} />
                                        <button onClick={() => deleteTask(task.id)} className="w-7 h-7 rounded-xl flex items-center justify-center text-latte-200 hover:text-red-400 hover:bg-red-50 transition-all active:scale-90">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Done Tasks */}
                {done.length > 0 && (
                    <section>
                        <p className="text-xs font-semibold text-latte-300 uppercase tracking-wide mb-2">Completed</p>
                        <div className="space-y-2">
                            {done.map((task) => (
                                <div key={task.id} className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-latte-50 border border-latte-100 opacity-60">
                                    <button onClick={() => toggleDone(task)} className="w-6 h-6 rounded-full bg-latte-400 flex-shrink-0 flex items-center justify-center active:scale-90">
                                        <CheckCircle className="w-4 h-4 text-white" strokeWidth={2} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-latte-400 line-through truncate">{task.title}</p>
                                        <p className="text-xs text-latte-300">{task.className}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <TaskModal open={taskModal.open} classId={taskModal.classId} existing={taskModal.data} classes={classes} onClose={() => setTaskModal({ open: false })} onCreate={addTask} onUpdate={updateTask} />
        </div>
    );
}
