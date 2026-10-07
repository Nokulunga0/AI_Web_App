import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, NotebookPen, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, EmptyState, ErrorState, LoadingState, PageHeader, SourceBadge, copyText, errMsg } from "@/components/common";
import { summarizeMeeting } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import type { MeetingResult } from "@/lib/types";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — Focusly" },
      { name: "description", content: "Turn long meeting notes into a summary, decisions and action items." },
      { property: "og:title", content: "Meeting Notes Summarizer — Focusly" },
      { property: "og:description", content: "Turn long meeting notes into a summary, decisions and action items." },
    ],
  }),
  component: MeetingsPage,
});

const SAMPLE = `Project sync – Group 4
We reviewed progress on the mobile app prototype. The login screen is done but the dashboard still needs work.
We decided to use Firebase for authentication.
Thabo will finish the dashboard UI by Friday.
Lerato needs to write the user testing script.
Someone should book the lab for testing.
Agreed to meet again next Tuesday.`;

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
      ) : <p className="text-sm text-muted-foreground">None mentioned.</p>}
    </div>
  );
}

function toText(r: MeetingResult) {
  const l = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : "- None mentioned");
  return `SUMMARY\n${r.summary}\n\nKEY POINTS\n${l(r.keyPoints)}\n\nDECISIONS\n${l(r.decisions)}\n\nACTION ITEMS\n${
    r.actionItems.length ? r.actionItems.map((a) => `- ${a.task} | Owner: ${a.owner ?? "Not specified"} | Deadline: ${a.deadline ?? "Not specified"}`).join("\n") : "- None"
  }`;
}

function MeetingsPage() {
  const { settings, log } = useStore();
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (notes.trim().length < 20) { setError("Please paste at least a few sentences of meeting notes."); return; }
    setLoading(true); setError(null);
    try {
      const r = await summarizeMeeting({ data: { notes, demo: settings.demoMode } });
      setResult(r);
      log("meeting", `Summarized a meeting — ${r.actionItems.length} action item${r.actionItems.length === 1 ? "" : "s"}`);
      toast.success("Summary ready");
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Meeting Notes" description="Paste raw notes — get a summary, decisions and who does what." />
      <Card className="shadow-card">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="notes">Meeting notes</Label>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setNotes(SAMPLE)}>Use sample notes</Button>
          </div>
          <Textarea id="notes" rows={9} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={30000} placeholder="Paste your meeting notes here…" />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={loading}><Sparkles /> Summarize</Button>
            <Button variant="outline" disabled={loading} onClick={() => { setNotes(""); setResult(null); setError(null); }}><Trash2 /> Clear</Button>
            <span className="ml-auto text-xs text-muted-foreground">{notes.length.toLocaleString()} characters</span>
          </div>
          {error && <ErrorState message={error} />}
        </CardContent>
      </Card>

      {loading ? <LoadingState label="Reading your notes…" /> : result ? (
        <Card className="shadow-card animate-rise">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Summary</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={result.source} />
              <Button size="sm" variant="secondary" onClick={() => copyText(toText(result))}><Copy /> Copy</Button>
              <Button size="sm" variant="outline" onClick={run}><RefreshCw /> Regenerate</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed">{result.summary}</p>
            <div className="grid gap-6 md:grid-cols-2">
              <List title="Key discussion points" items={result.keyPoints} />
              <List title="Decisions" items={result.decisions} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Action items</h3>
              {result.actionItems.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Responsible</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {result.actionItems.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className="min-w-56">{a.task}</TableCell>
                          <TableCell className={a.owner ? "" : "italic text-muted-foreground"}>{a.owner ?? "Not specified"}</TableCell>
                          <TableCell className={a.deadline ? "" : "italic text-muted-foreground"}>{a.deadline ?? "Not specified"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground">No action items found.</p>}
            </div>
            <List title="Deadlines" items={result.deadlines.map((d) => `${d.date} — ${d.item}`)} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={<NotebookPen className="size-5" />} title="No summary yet" text="Missing owners or deadlines are shown as “Not specified” — nothing is invented." />
      )}
      <Disclaimer compact />
    </div>
  );
}
