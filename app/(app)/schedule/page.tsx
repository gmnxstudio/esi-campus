"use client";

import { useAppData } from "@/hooks/useAppData";
import { DAY_NAMES } from "@/lib/types";
import { ClassWithRelations } from "@/lib/types";
import ClassCard from "@/components/ClassCard";
import ClassModal from "@/components/modals/ClassModal";
import TaskModal from "@/components/modals/TaskModal";
import ExamModal from "@/components/modals/ExamModal";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Class, Task, Exam } from "@/lib/types";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
    const { classes, loading, addClass, updateClass, deleteClass, addTask, updateTask, addExam, updateExam } = useAppData();
    const [classModal, setClassModal] = useState<{ open: boolean; data?: ClassWithRelations }>({ open: false });
    const [taskModal, setTaskModal] = useState<{ open: boolean; classId?: string; data?: Task }>({ open: false });
    const [examModal, setExamModal] = useState<{ open: boolean; classId?: string; data?: Exam }>({ open: false });

    const today = new Date().getDay();

    // Group classes by day
    const byDay: Record<number, ClassWithRelations[]> = {};
    classes.forEach((c) => {
        if (!byDay[c.day_of_week]) byDay[c.day_of_week] = [];
        byDay[c.day_of_week].push(c);
    });

    // Sort days starting from today
    const sortedDays = Array.from({ length: 7 }, (_, i) => (today + i) % 7).filter((d) => byDay[d]);

    return (
        <div className="min-h-screen latte-gradient-card">
            <header className="px-5 pt-14 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-5 h-5 text-latte-400" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-latte-700">Weekly Schedule</h1>
                </div>
                <p className="text-sm text-latte-400">{classes.length} class{classes.length !== 1 ? "es" : ""} scheduled</p>
            </header>

            <div className="px-5 pb-safe space-y-5"
                style={{ paddingBottom: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}>
                {loading && (
                    <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-3xl shimmer" />)}</div>
                )}

                {!loading && classes.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">📅</p>
                        <p className="font-semibold text-latte-600 mb-1">No schedule yet</p>
                        <p className="text-sm text-latte-400">Add classes from the dashboard to build your week.</p>
                    </div>
                )}

                {!loading && sortedDays.map((dow) => (
                    <section key={dow}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dow === today ? "bg-latte-400 text-white" : "bg-latte-100 text-latte-500"}`}>
                                {DAY_NAMES[dow]}
                            </span>
                            {dow === today && <span className="text-xs text-latte-400">· Today</span>}
                        </div>
                        <div className="space-y-3">
                            {byDay[dow].map((cls) => (
                                <ClassCard
                                    key={cls.id}
                                    cls={cls}
                                    onEdit={(c) => setClassModal({ open: true, data: c })}
                                    onDelete={async (id) => { if (confirm("Delete this class?")) await deleteClass(id); }}
                                    onAddTask={(cid) => setTaskModal({ open: true, classId: cid })}
                                    onAddExam={(cid) => setExamModal({ open: true, classId: cid })}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <ClassModal open={classModal.open} existing={classModal.data} onClose={() => setClassModal({ open: false })} onCreate={addClass} onUpdate={updateClass} />
            <TaskModal open={taskModal.open} classId={taskModal.classId} existing={taskModal.data} classes={classes} onClose={() => setTaskModal({ open: false })} onCreate={addTask} onUpdate={updateTask} />
            <ExamModal open={examModal.open} classId={examModal.classId} existing={examModal.data} classes={classes} onClose={() => setExamModal({ open: false })} onCreate={addExam} onUpdate={updateExam} />
        </div>
    );
}
