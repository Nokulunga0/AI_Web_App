export type Priority = "High" | "Medium" | "Low";

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  duration: number; // minutes
  deadline: string; // YYYY-MM-DD or ""
  category: string;
  completed: boolean;
  createdAt: string;
  aiReason?: string;
}

export interface ScheduleBlock {
  date: string;
  start: string;
  end: string;
  taskId: string;
  taskName: string;
  priority: Priority;
}

export interface Schedule {
  mode: "daily" | "weekly";
  generatedAt: string;
  summary: string;
  blocks: ScheduleBlock[];
  unscheduled: string[];
  source: "ai" | "mock";
}

export type ActivityType = "email" | "meeting" | "task" | "schedule";

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  at: string;
}

export interface Settings {
  name: string;
  demoMode: boolean;
  workStart: string;
  workEnd: string;
}

export interface EmailResult {
  subject: string;
  body: string;
  source: "ai" | "mock";
}

export interface ActionItem {
  task: string;
  owner: string | null;
  deadline: string | null;
}

export interface MeetingResult {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  deadlines: { item: string; date: string }[];
  source: "ai" | "mock";
}

export interface RankedTask {
  id: string;
  reason: string;
}
