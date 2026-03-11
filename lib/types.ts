// ── Database types for Praishe's Campus ──────────────────

// AI Plan type (returned by Gemini per task)
export interface AiPlan {
    summary: string;
    steps: string[];
    estimated_time: string;
    motivation: string;
}

// AI Agent suggestion type (holistic analysis of all tasks)
export interface AiSuggestion {
    overall_status: string;        // e.g. "You have 3 urgent tasks this week!"
    priority_tasks: {
        title: string;
        reason: string;
        urgency: "high" | "medium" | "low";
    }[];
    action_plan: string[];         // Ordered list of what to do today/this week
    wellness_tip: string;          // Mental health / study tip
    motivation: string;
}

export interface Class {
    id: string;
    subject: string;
    day_of_week: number; // 0 = Sunday, 1 = Monday, ...
    start_time: string;   // "HH:MM:SS"
    end_time: string;
    room: string | null;
    color_code: string;
    lecturer: string | null;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    class_id: string;
    title: string;
    description: string | null;
    due_date: string;      // "YYYY-MM-DD"
    status: "pending" | "in_progress" | "done";
    ai_plan: AiPlan | null;
    created_at: string;
    updated_at: string;
}

export interface Exam {
    id: string;
    class_id: string;
    title: string;
    exam_date: string;     // "YYYY-MM-DD"
    exam_time: string | null;
    room_location: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface PushSubscription {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
    created_at: string;
}

// Extended types with relations
export interface ClassWithRelations extends Class {
    tasks?: Task[];
    exams?: Exam[];
}

// Day of week helpers
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CLASS_COLORS = [
    { label: "Latte", value: "#c8a97e" },
    { label: "Rose", value: "#e8a5a5" },
    { label: "Sage", value: "#a5c8a5" },
    { label: "Sky", value: "#a5b8e8" },
    { label: "Lavender", value: "#c4a5e8" },
    { label: "Peach", value: "#e8c4a5" },
    { label: "Mint", value: "#a5e8cc" },
    { label: "Slate", value: "#a5b5c8" },
];
