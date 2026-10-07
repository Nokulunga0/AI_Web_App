import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, ListChecks, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Disclaimer, EmptyState, ErrorState, PageHeader, PriorityBadge, errMsg } from "@/components/common";
import { TaskDialog } from "@/components/task-dialog";
import { prioritizeTasks } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { daysUntil, toISODate } from "@/lib/planner";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Focusly" },
      { name: "description", content: "Add, edit and complete tasks, and let AI prioritize them for you." },
      { property: "og:title", content: "AI Task Planner — Focusly" },
      { property: "og:description", content: "Add, edit and complete tasks, and let AI prioritize them for you." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const s = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const today = toISODate(new Date());

  const shown = s.tasks.filter((t) => (filter === "all" ? true : filter === "pending" ? !t.completed : t.completed));

  const prioritize = async () => {
    const pending = s.tasks.filter((t) => !t.completed);
    if (!pending.length) { toast.info("No pending tasks to prioritize."); return; }
    setLoading(true); setError(null);
    try {
      const r = await prioritizeTasks({ data: { tasks: pending, today, demo: s.settings.demoMode } });
      const byId = new Map(s.tasks.map((t) => [t.id, t]));
      const ordered = r.ranking.map((x) => ({ ...byId.get(x.id)!, aiReason: x.reason }));
      s.setTasks([...ordered, ...s.tasks.filter((t) => t.completed)]);
      setSummary(r.summary);
      s.log("task", `AI prioritized ${pending.length} tasks`);
      toast.success("Tasks reprioritized");
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Planner"
        description="Capture your work and let AI decide what comes first."
        actions={<>
          <Button variant="outline" onClick={prioritize} disabled={loading}><Sparkles className={cn(loading && "animate-pulse")} /> {loading ? "Prioritizing…" : "AI prioritize"}</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New task</Button>
        </>}
      />
      {error && <ErrorState message={error} />}
      {summary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/60 p-4 text-sm text-secondary-foreground animate-rise">
          <p><strong>AI plan:</strong> {summary}</p>
          <Button asChild size="sm"><Link to="/schedule"><CalendarClock /> Build schedule</Link></Button>
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({s.tasks.filter((t) => !t.completed).length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({s.tasks.filter((t) => t.completed).length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {!s.ready ? null : shown.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-5" />} title={filter === "completed" ? "Nothing completed yet" : "No tasks here"}
          text="Add a task with a priority, duration and deadline to get started."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add task</Button>} />
      ) : (
        <ul className="space-y-2">
          {shown.map((t, idx) => {
            const d = daysUntil(t.deadline, today);
            return (
              <li key={t.id} className="animate-rise">
                <Card className={cn("shadow-card transition", t.completed && "opacity-60")}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Checkbox checked={t.completed} onCheckedChange={() => s.toggleTask(t.id)} aria-label={`Mark ${t.name} ${t.completed ? "incomplete" : "complete"}`} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {filter === "pending" && <span className="font-display text-xs text-muted-foreground">#{idx + 1}</span>}
                        <p className={cn("font-medium", t.completed && "line-through")}>{t.name}</p>
                        <PriorityBadge p={t.priority} />
                      </div>
                      {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t.category} · {t.duration} min ·{" "}
                        <span className={cn(d !== null && d <= 0 && !t.completed && "font-medium text-destructive")}>
                          {t.deadline ? (d! < 0 ? `Overdue (${t.deadline})` : d === 0 ? "Due today" : `Due ${t.deadline}`) : "No deadline"}
                        </span>
                      </p>
                      {t.aiReason && !t.completed && <p className="mt-1 text-xs text-primary"><Sparkles className="mr-1 inline size-3" />{t.aiReason}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => s.moveTask(t.id, -1)}><ArrowUp /></Button>
                      <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => s.moveTask(t.id, 1)}><ArrowDown /></Button>
                      <Button size="icon" variant="ghost" aria-label="Edit task" onClick={() => { setEditing(t); setOpen(true); }}><Pencil /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => { s.deleteTask(t.id); toast.success("Task deleted"); }}><Trash2 /></Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <TaskDialog open={open} onOpenChange={setOpen} initial={editing}
        onSave={(d) => {
          if (editing) { s.updateTask(editing.id, d); toast.success("Task updated"); }
          else { s.addTask(d); s.log("task", `Added task “${d.name}”`); toast.success("Task added"); }
        }} />
      <Disclaimer compact />
    </div>
  );
}
