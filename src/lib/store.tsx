import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Activity, ActivityType, Schedule, Settings, Task } from "./types";
import { toISODate } from "./planner";

interface State {
  tasks: Task[];
  schedule: Schedule | null;
  activity: Activity[];
  emailsGenerated: number;
  meetingsSummarized: number;
  settings: Settings;
}

const KEY = "ai-productivity-assistant-v1";
const defaultSettings: Settings = { name: "", demoMode: false, workStart: "09:00", workEnd: "17:00" };

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): State {
  const d = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return toISODate(x);
  };
  const now = new Date().toISOString();
  const t = (name: string, description: string, priority: Task["priority"], duration: number, deadline: string, category: string): Task => ({
    id: uid(), name, description, priority, duration, deadline, category, completed: false, createdAt: now,
  });
  return {
    tasks: [
      t("Finish research report draft", "Complete sections 3 and 4 with references", "High", 120, d(1), "Study"),
      t("Prepare group presentation slides", "10 slides for Friday's seminar", "Medium", 90, d(3), "Study"),
      t("Reply to internship coordinator", "Confirm interview availability", "High", 20, d(0), "Career"),
      t("Review lecture notes", "Weeks 5–6 for upcoming quiz", "Low", 60, d(6), "Study"),
    ],
    schedule: null,
    activity: [],
    emailsGenerated: 0,
    meetingsSummarized: 0,
    settings: defaultSettings,
  };
}

interface Store extends State {
  ready: boolean;
  addTask: (t: Omit<Task, "id" | "createdAt" | "completed">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, dir: -1 | 1) => void;
  setTasks: (tasks: Task[]) => void;
  setSchedule: (s: Schedule | null) => void;
  log: (type: ActivityType, text: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ tasks: [], schedule: null, activity: [], emailsGenerated: 0, meetingsSummarized: 0, settings: defaultSettings });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setState({ ...seed(), ...p, settings: { ...defaultSettings, ...p.settings } });
      } else setState(seed());
    } catch {
      setState(seed());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const log = useCallback((type: ActivityType, text: string) => {
    setState((s) => ({
      ...s,
      emailsGenerated: s.emailsGenerated + (type === "email" ? 1 : 0),
      meetingsSummarized: s.meetingsSummarized + (type === "meeting" ? 1 : 0),
      activity: [{ id: uid(), type, text, at: new Date().toISOString() }, ...s.activity].slice(0, 30),
    }));
  }, []);

  const value: Store = {
    ...state,
    ready,
    log,
    addTask: (t) =>
      setState((s) => ({ ...s, tasks: [...s.tasks, { ...t, id: uid(), createdAt: new Date().toISOString(), completed: false }] })),
    updateTask: (id, patch) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    deleteTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    toggleTask: (id) =>
      setState((s) => {
        const task = s.tasks.find((t) => t.id === id);
        const activity = task && !task.completed
          ? [{ id: uid(), type: "task" as const, text: `Completed “${task.name}”`, at: new Date().toISOString() }, ...s.activity].slice(0, 30)
          : s.activity;
        return { ...s, activity, tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) };
      }),
    moveTask: (id, dir) =>
      setState((s) => {
        const i = s.tasks.findIndex((t) => t.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.tasks.length) return s;
        const tasks = [...s.tasks];
        [tasks[i], tasks[j]] = [tasks[j]!, tasks[i]!];
        return { ...s, tasks };
      }),
    setTasks: (tasks) => setState((s) => ({ ...s, tasks })),
    setSchedule: (schedule) => setState((s) => ({ ...s, schedule })),
    updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    resetAll: () => setState(seed()),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
