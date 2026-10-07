import type { RankedTask, ScheduleBlock, Task } from "./types";

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(deadline: string, today: string) {
  if (!deadline) return null;
  const a = new Date(today + "T00:00:00").getTime();
  const b = new Date(deadline + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

const weight = { High: 3, Medium: 2, Low: 1 } as const;

/** Deterministic priority score: urgency + priority + deadline + duration. */
export function scoreTask(t: Task, today: string) {
  let s = weight[t.priority] * 30;
  const d = daysUntil(t.deadline, today);
  if (d !== null) s += d < 0 ? 100 : Math.max(0, 70 - d * 10);
  if (t.duration <= 30) s += 8;
  return s;
}

export function rankTasks(tasks: Task[], today: string): RankedTask[] {
  return [...tasks]
    .sort((a, b) => scoreTask(b, today) - scoreTask(a, today))
    .map((t) => {
      const d = daysUntil(t.deadline, today);
      const parts = [`${t.priority} priority`];
      if (d !== null) parts.push(d < 0 ? "overdue" : d === 0 ? "due today" : `due in ${d} day${d === 1 ? "" : "s"}`);
      else parts.push("no deadline");
      if (t.duration <= 30) parts.push("quick win");
      return { id: t.id, reason: parts.join(" · ") };
    });
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Packs ranked tasks into working hours across 1 (daily) or 5 working days (weekly). */
export function buildBlocks(
  ordered: Task[],
  mode: "daily" | "weekly",
  startDate: string,
  workStart: string,
  workEnd: string,
) {
  const dayStart = toMin(workStart);
  const dayEnd = Math.max(toMin(workEnd), dayStart + 60);
  const days: string[] = [];
  const d = new Date(startDate + "T00:00:00");
  const want = mode === "daily" ? 1 : 5;
  while (days.length < want) {
    const wd = d.getDay();
    if (mode === "daily" || (wd !== 0 && wd !== 6)) days.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  const blocks: ScheduleBlock[] = [];
  const unscheduled: string[] = [];
  let di = 0;
  let cursor = dayStart;
  for (const t of ordered) {
    let remaining = Math.max(15, t.duration);
    while (remaining > 0 && di < days.length) {
      const avail = dayEnd - cursor;
      if (avail < 15) {
        di++;
        cursor = dayStart;
        continue;
      }
      const chunk = Math.min(remaining, avail);
      blocks.push({
        date: days[di],
        start: toHHMM(cursor),
        end: toHHMM(cursor + chunk),
        taskId: t.id,
        taskName: t.name,
        priority: t.priority,
      });
      remaining -= chunk;
      cursor += chunk + 10;
    }
    if (remaining > 0) unscheduled.push(t.name);
  }
  return { blocks, unscheduled };
}
