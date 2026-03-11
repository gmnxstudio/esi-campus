"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiPlan, AiSuggestion, Task } from "@/lib/types";

export async function generateTaskPlan(
    title: string,
    description: string
): Promise<AiPlan> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert Academic Success Coach helping a university student plan their assignments.

Analyze this task and create a clear action plan:
- Title: ${title}
- Notes: ${description || "No additional notes"}

Respond ONLY with a valid JSON object (no markdown, no code blocks, just raw JSON):
{
  "summary": "One sentence summary of what this task requires",
  "steps": ["Step 1", "Step 2", "Step 3", "Step 4"],
  "estimated_time": "Realistic time estimate (e.g. '3-4 hours')",
  "motivation": "A short encouraging message in Bahasa Indonesia or English"
}

Rules:
- steps must have 3-5 items, each actionable and specific
- summary must be in the same language as the task title
- motivation must be warm and encouraging
- Return ONLY the JSON object, nothing else`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Strip markdown code blocks if model wraps the response
        const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

        const parsed: AiPlan = JSON.parse(cleaned);

        // Validate required fields
        if (
            typeof parsed.summary !== "string" ||
            !Array.isArray(parsed.steps) ||
            typeof parsed.estimated_time !== "string" ||
            typeof parsed.motivation !== "string"
        ) {
            throw new Error("AI returned unexpected format.");
        }

        return parsed;
    } catch (e: unknown) {
        if (e instanceof SyntaxError) {
            throw new Error("AI tidak dapat memproses permintaan. Coba lagi.");
        }
        const msg = e instanceof Error ? e.message : "Unknown error";
        // Re-throw user-friendly messages
        if (msg.includes("quota") || msg.includes("429")) {
            throw new Error("Batas penggunaan AI tercapai. Coba beberapa saat lagi.");
        }
        if (msg.includes("API key")) {
            throw new Error("Konfigurasi AI bermasalah. Hubungi admin.");
        }
        throw new Error(msg || "Gagal menghasilkan rencana AI. Coba lagi.");
    }
}

// ── AI Agent: Holistic Task Analysis ─────────────────────────────────────────
export async function getAiSuggestions(
    tasks: Pick<Task, "title" | "description" | "due_date" | "status">[]
): Promise<AiSuggestion> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

    if (tasks.length === 0) {
        throw new Error("Tidak ada task untuk dianalisis. Tambahkan task terlebih dahulu!");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const today = new Date().toISOString().split("T")[0];
    const taskList = tasks
        .map((t, i) =>
            `${i + 1}. "${t.title}" — due: ${t.due_date}, status: ${t.status}${t.description ? `, notes: ${t.description}` : ""}`
        )
        .join("\n");

    const prompt = `You are a caring Academic Success Coach AI Agent for a university student.
Today's date: ${today}

Here are all the student's current tasks:
${taskList}

Analyze ALL tasks holistically and respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "overall_status": "One energetic sentence about their current workload situation",
  "priority_tasks": [
    { "title": "exact task title", "reason": "why this needs attention now", "urgency": "high" },
    { "title": "exact task title", "reason": "why this is important", "urgency": "medium" }
  ],
  "action_plan": ["Concrete action 1 for today/this week", "Action 2", "Action 3"],
  "wellness_tip": "A short study wellness or time management tip relevant to their situation",
  "motivation": "A warm, personal encouraging message in Bahasa Indonesia"
}

Rules:
- priority_tasks: include 2-4 most important tasks, sorted by urgency (high → low)
- urgency: "high" = due within 3 days or overdue, "medium" = due within 7 days, "low" = later
- action_plan: 3-5 specific, actionable items based on their actual tasks
- wellness_tip: practical tip (e.g. Pomodoro, breaks, prioritization technique)
- All text should feel personal and warm, not robotic
- Return ONLY the JSON, nothing else`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();

        const parsed: AiSuggestion = JSON.parse(cleaned);

        if (
            typeof parsed.overall_status !== "string" ||
            !Array.isArray(parsed.priority_tasks) ||
            !Array.isArray(parsed.action_plan) ||
            typeof parsed.wellness_tip !== "string" ||
            typeof parsed.motivation !== "string"
        ) {
            throw new Error("Format respons AI tidak valid.");
        }

        return parsed;
    } catch (e: unknown) {
        if (e instanceof SyntaxError) throw new Error("AI tidak dapat memproses. Coba lagi.");
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg.includes("quota") || msg.includes("429")) throw new Error("Batas AI tercapai. Coba beberapa saat lagi.");
        throw new Error(msg || "Gagal menghubungi AI. Coba lagi.");
    }
}
