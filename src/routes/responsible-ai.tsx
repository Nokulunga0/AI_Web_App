import { createFileRoute } from "@tanstack/react-router";
import { Eye, Lock, Scale, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Disclaimer, PageHeader } from "@/components/common";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI — Focusly" },
      { name: "description", content: "How Focusly uses AI, its limitations, and how to use it responsibly." },
      { property: "og:title", content: "Responsible AI — Focusly" },
      { property: "og:description", content: "How Focusly uses AI, its limitations, and how to use it responsibly." },
    ],
  }),
  component: ResponsibleAI,
});

const points = [
  { icon: UserCheck, title: "You stay in control", text: "AI drafts and suggests. You decide what gets sent, agreed or scheduled." },
  { icon: Eye, title: "Verify before you act", text: "Check names, dates and facts. AI can misread notes or misjudge priorities." },
  { icon: Scale, title: "No invented details", text: "The meeting summarizer is instructed to mark missing owners and deadlines as “Not specified” instead of guessing." },
  { icon: Lock, title: "Protect sensitive data", text: "Don't paste passwords, ID numbers, health or financial details. Your tasks are stored only in this browser." },
];

function ResponsibleAI() {
  return (
    <div className="space-y-6">
      <PageHeader title="Responsible AI" description="What this assistant can and can't do." />
      <Disclaimer />
      <div className="grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <Card key={p.title} className="shadow-card animate-rise">
            <CardContent className="flex gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><p.icon className="size-5" aria-hidden /></div>
              <div>
                <h2 className="font-display text-base font-semibold">{p.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
