import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Clock, ListChecks, Mail, NotebookPen, Sparkles, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disclaimer, EmptyState, PageHeader, PriorityBadge } from "@/components/common";
import { useStore } from "@/lib/store";
import { daysUntil, toISODate } from "@/lib/planner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Focusly AI Productivity Assistant" },
      { name: "description", content: "Your tasks, deadlines, generated emails and meeting summaries in one place." },
      { property: "og:title", content: "Dashboard — Focusly AI Productivity Assistant" },
      { property: "og:description", content: "Your tasks, deadlines, generated emails and meeting summaries in one place." },
    ],
  }),
  component: Dashboard,
});

const activityIcon: Record<string, LucideIcon> = { email: Mail, meeting: NotebookPen, task: CheckCircle2, schedule: CalendarClock };

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <Card className="shadow-card animate-rise">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Icon className="size-5" aria-hidden /></div>
        <div>
          <p className="font-display text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const s = useStore();
  const today = toISODate(new Date());
  const pending = s.tasks.filter((t) => !t.completed);
  const completed = s.tasks.filter((t) => t.completed);
  const dueToday = pending.filter((t) => t.deadline && t.deadline <= today);
  const upcoming = pending
    .filter((t) => t.deadline && (daysUntil(t.deadline, today) ?? 99) <= 14)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 6);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader title={`${greet}${s.settings.name ? `, ${s.settings.name}` : ""}`} description="Here's what's on your plate today." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Due today" value={dueToday.length} icon={Clock} />
        <Stat label="Pending" value={pending.length} icon={ListChecks} />
        <Stat label="Completed" value={completed.length} icon={CheckCircle2} />
        <Stat label="Upcoming deadlines" value={upcoming.length} icon={CalendarClock} />
        <Stat label="Emails generated" value={s.emailsGenerated} icon={Mail} />
        <Stat label="Meetings summarized" value={s.meetingsSummarized} icon={NotebookPen} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: "/email", label: "Write an email", text: "Draft in seconds", icon: Mail },
          { to: "/meetings", label: "Summarize a meeting", text: "Turn notes into actions", icon: NotebookPen },
          { to: "/tasks", label: "Plan my tasks", text: "Prioritize with AI", icon: Sparkles },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><q.icon className="size-5" aria-hidden /></div>
            <div>
              <p className="font-display text-sm font-semibold">{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.text}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Due today & upcoming</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/tasks">All tasks</Link></Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 && dueToday.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="size-5" />} title="Nothing urgent" text="No deadlines in the next two weeks. Enjoy the breathing room." />
            ) : (
              <ul className="divide-y">
                {[...new Map([...dueToday, ...upcoming].map((t) => [t.id, t])).values()].map((t) => {
                  const d = daysUntil(t.deadline, today)!;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className={`text-xs ${d <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {d < 0 ? `Overdue by ${-d} day${d === -1 ? "" : "s"}` : d === 0 ? "Due today" : `Due in ${d} day${d === 1 ? "" : "s"}`} · {t.category}
                        </p>
                      </div>
                      <PriorityBadge p={t.priority} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent>
            {s.activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Your AI activity will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {s.activity.slice(0, 7).map((a) => {
                  const Icon = activityIcon[a.type] ?? CheckCircle2;
                  return (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate">{a.text}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Disclaimer compact />
    </div>
  );
}
