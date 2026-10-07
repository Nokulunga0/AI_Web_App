import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAiJson } from "./ai.server";
import { mockEmail, mockMeeting } from "./mock-ai";
import { rankTasks } from "./planner";
import type { EmailResult, MeetingResult, RankedTask } from "./types";

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        purpose: z.string().min(5).max(3000),
        tone: z.enum(["Formal", "Friendly", "Persuasive"]),
        recipient: z.string().max(100).optional(),
        demo: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<EmailResult> => {
    if (data.demo) return mockEmail(data.purpose, data.tone, data.recipient);
    const out = await callAiJson(
      `You write professional emails in a ${data.tone} tone. Return {"subject": string, "body": string}. Use "[Your Name]" as the sign-off placeholder. Do not invent facts, dates or numbers the user did not give.`,
      `Recipient: ${data.recipient || "not specified"}\nPurpose/context: ${data.purpose}`,
    );
    if (!out) return mockEmail(data.purpose, data.tone, data.recipient);
    return { subject: String(out.subject ?? ""), body: String(out.body ?? ""), source: "ai" };
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ notes: z.string().min(20).max(30000), demo: z.boolean() }).parse(d))
  .handler(async ({ data }): Promise<MeetingResult> => {
    if (data.demo) return mockMeeting(data.notes);
    const out = await callAiJson(
      `You summarize meeting notes. Return {"summary": string, "keyPoints": string[], "decisions": string[], "actionItems": [{"task": string, "owner": string|null, "deadline": string|null}], "deadlines": [{"item": string, "date": string}]}.
STRICT RULE: never invent people or deadlines. If an owner or deadline is not explicitly mentioned in the notes, use null. Only list deadlines literally stated.`,
      data.notes,
    );
    if (!out) return mockMeeting(data.notes);
    return {
      summary: String(out.summary ?? ""),
      keyPoints: Array.isArray(out.keyPoints) ? out.keyPoints.map(String) : [],
      decisions: Array.isArray(out.decisions) ? out.decisions.map(String) : [],
      actionItems: Array.isArray(out.actionItems)
        ? out.actionItems.map((a: any) => ({
            task: String(a.task ?? ""),
            owner: a.owner ? String(a.owner) : null,
            deadline: a.deadline ? String(a.deadline) : null,
          }))
        : [],
      deadlines: Array.isArray(out.deadlines)
        ? out.deadlines.map((x: any) => ({ item: String(x.item ?? ""), date: String(x.date ?? "") }))
        : [],
      source: "ai",
    };
  });

const taskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.enum(["High", "Medium", "Low"]),
  duration: z.number(),
  deadline: z.string(),
  category: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
  aiReason: z.string().optional(),
});

export const prioritizeTasks = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ tasks: z.array(taskSchema).max(100), today: z.string(), demo: z.boolean() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ranking: RankedTask[]; summary: string; source: "ai" | "mock" }> => {
    const fallback = rankTasks(data.tasks, data.today);
    const mockSummary = `Ordered ${data.tasks.length} tasks by urgency, priority, deadline and duration. Overdue and high-priority work comes first.`;
    if (data.demo || data.tasks.length === 0) return { ranking: fallback, summary: mockSummary, source: "mock" };
    const out = await callAiJson(
      `You are a productivity planner. Today is ${data.today}. Rank the tasks considering urgency, priority, deadline and estimated duration (minutes). Return {"ranking": [{"id": string, "reason": string (max 12 words)}], "summary": string (1-2 sentences)}. Include every id exactly once.`,
      JSON.stringify(data.tasks.map(({ id, name, priority, duration, deadline, category }) => ({ id, name, priority, duration, deadline, category }))),
    );
    if (!out || !Array.isArray(out.ranking)) return { ranking: fallback, summary: mockSummary, source: "mock" };
    const ids = new Set(data.tasks.map((t) => t.id));
    const seen = new Set<string>();
    const ranking: RankedTask[] = [];
    for (const r of out.ranking) {
      if (ids.has(r.id) && !seen.has(r.id)) {
        seen.add(r.id);
        ranking.push({ id: r.id, reason: String(r.reason ?? "") });
      }
    }
    for (const f of fallback) if (!seen.has(f.id)) ranking.push(f);
    return { ranking, summary: String(out.summary ?? mockSummary), source: "ai" };
  });
