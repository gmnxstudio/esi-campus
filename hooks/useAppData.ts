"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Class, Task, Exam, ClassWithRelations } from "@/lib/types";

export function useAppData() {
    const supabase = createClient();
    const [classes, setClasses] = useState<ClassWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [classesRes, tasksRes, examsRes] = await Promise.all([
                supabase.from("classes").select("*").order("day_of_week").order("start_time"),
                supabase.from("tasks").select("*").order("due_date"),
                supabase.from("exams").select("*").order("exam_date"),
            ]);

            if (classesRes.error) throw classesRes.error;

            const enriched: ClassWithRelations[] = (classesRes.data ?? []).map((cls) => ({
                ...cls,
                tasks: tasksRes.data?.filter((t) => t.class_id === cls.id) ?? [],
                exams: examsRes.data?.filter((e) => e.class_id === cls.id) ?? [],
            }));

            setClasses(enriched);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Classes ──────────────────────────────────────────────
    const addClass = async (data: Omit<Class, "id" | "created_at" | "updated_at">) => {
        const { error } = await supabase.from("classes").insert(data);
        if (error) throw error;
        await fetchData();
    };

    const updateClass = async (id: string, data: Partial<Class>) => {
        const { error } = await supabase.from("classes").update(data).eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    const deleteClass = async (id: string) => {
        const { error } = await supabase.from("classes").delete().eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    // ── Tasks ────────────────────────────────────────────────
    const addTask = async (data: Omit<Task, "id" | "created_at" | "updated_at">) => {
        const { error } = await supabase.from("tasks").insert(data);
        if (error) throw error;
        await fetchData();
    };

    const updateTask = async (id: string, data: Partial<Task>) => {
        const { error } = await supabase.from("tasks").update(data).eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    const deleteTask = async (id: string) => {
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    // ── Exams ────────────────────────────────────────────────
    const addExam = async (data: Omit<Exam, "id" | "created_at" | "updated_at">) => {
        const { error } = await supabase.from("exams").insert(data);
        if (error) throw error;
        await fetchData();
    };

    const updateExam = async (id: string, data: Partial<Exam>) => {
        const { error } = await supabase.from("exams").update(data).eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    const deleteExam = async (id: string) => {
        const { error } = await supabase.from("exams").delete().eq("id", id);
        if (error) throw error;
        await fetchData();
    };

    return {
        classes,
        loading,
        error,
        refresh: fetchData,
        addClass, updateClass, deleteClass,
        addTask, updateTask, deleteTask,
        addExam, updateExam, deleteExam,
    };
}

