// ── Database types for Praishe's Campus ──────────────────

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
