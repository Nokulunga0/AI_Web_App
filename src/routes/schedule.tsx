import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Disclaimer, EmptyState, ErrorState, LoadingState, PageHeader, PriorityBadge, SourceBadge, errMsg } from "@/components/common";
import { prioritizeTasks } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { buildBlocks, toISODate } from "@/lib/planner";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "AI Schedule — Focusly" },
      { name: "description", content: "Generate a daily or weekly schedule from your prioritized tasks." },
      { property: "og:title", content: "AI Schedule — Focusly" },
      { property: "og:description", content: "Generate a daily or weekly schedule from your prioritized tasks." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const s = useStore();
  const [mode, setMode] = useState<"daily" | "weekly">(s.schedule?.mode ?? "daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = s.tasks.filter((t) => !t.completed);

  const generate = async () => {
    if (!pending.length) return toast.info("Add some pending tasks first.");
    setLoading(true); setError(null);
    try {
      const today = toISODate(new Date());
      const r = await prioritizeTasks({ data: { tasks: pending, today, demo: s.settings.demoMode } });
      const byId = new Map(pending.map((t) => [t.id, t]));
      const ordered = r.ranking.map((x) => byId.get(x.id)!).filter(Boolean);
      const { blocks, unscheduled } = buildBlocks(ordered, mode, today, s.settings.workStart, s.settings.workEnd);
      s.setSchedule({ mode, generatedAt: new Date().toISOString(), summary: r.summary, blocks, unscheduled, source: r.source });
      s.log("schedule", `Generated a ${mode} schedule with ${blocks.length} blocks`);
      toast.success("Schedule ready");
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  const sch = s.schedule;
  const days = sch ? [...new Set(sch.blocks.map((b) => b.date))] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description={`Time-blocked plan within your working hours (${s.settings.workStart}–${s.settings.workEnd}).`}
        actions={<>
          <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(v) => v && setMode(v as typeof mode)} aria-label="Schedule length">
            <ToggleGroupItem value="daily" className="px-4">Daily</ToggleGroupItem>
            <ToggleGroupItem value="weekly" className="px-4">Weekly</ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={generate} disabled={loading}>{sch ? <RefreshCw /> : <Sparkles />} {sch ? "Regenerate" : "Generate"}</Button>
        </>}
      />
      {error && <ErrorState message={error} />}

      {loading ? <LoadingState label="Planning your time…" /> : !sch ? (
        <EmptyState icon={<CalendarClock className="size-5" />} title="No schedule yet"
          text={pending.length ? `You have ${pending.length} pending tasks. Generate a ${mode} plan.` : "Add tasks in the Task Planner first."}
          action={pending.length ? <Button onClick={generate}><Sparkles /> Generate schedule</Button> : <Button asChild><Link to="/tasks">Go to tasks</Link></Button>} />
      ) : (
        <div className="space-y-4 animate-rise">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <SourceBadge source={sch.source} />
            <span className="capitalize">{sch.mode} plan</span> · generated {new Date(sch.generatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
          <p className="text-sm">{sch.summary}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {days.map((day) => (
              <Card key={day} className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{new Date(day + "T00:00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {sch.blocks.filter((b) => b.date === day).map((b, i) => (
                      <li key={i} className="flex gap-3 rounded-lg border-l-4 border-primary bg-muted/50 p-3">
                        <span className="w-24 shrink-0 font-display text-xs font-medium text-muted-foreground">{b.start}–{b.end}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{b.taskName}</p>
                          <div className="mt-1"><PriorityBadge p={b.priority} /></div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
          {sch.unscheduled.length > 0 && (
            <div role="status" className="rounded-lg border border-warning/40 bg-accent/60 p-4 text-sm text-accent-foreground">
              <strong>Didn't fit:</strong> {sch.unscheduled.join(", ")}. Try the weekly view or extend your working hours in Settings.
            </div>
          )}
        </div>
      )}
      <Disclaimer compact />
    </div>
  );
}
