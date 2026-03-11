"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiPlan } from "@/lib/types";

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
