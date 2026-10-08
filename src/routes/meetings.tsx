import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, Download, FileAudio, Loader2, Mic, NotebookPen, Pause, Play, RefreshCw, Sparkles, Square, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, EmptyState, ErrorState, LoadingState, PageHeader, SourceBadge, copyText, errMsg } from "@/components/common";
import { summarizeMeeting } from "@/lib/ai.functions";
import { fmtTime, startRecorder, transcribeAudio } from "@/lib/audio";
import { useStore } from "@/lib/store";
import type { MeetingResult } from "@/lib/types";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — Focusly" },
      { name: "description", content: "Paste notes or record audio and get a summary, decisions and action items." },
      { property: "og:title", content: "Meeting Notes Summarizer — Focusly" },
      { property: "og:description", content: "Paste notes or record audio and get a summary, decisions and action items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

const NS = "Not specified";
const STATUSES = ["Not started", "In progress", "Done"] as const;
type Status = (typeof STATUSES)[number];

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
      ) : <p className="text-sm text-muted-foreground">{NS}</p>}
    </div>
  );
}

function toText(r: MeetingResult, statuses: Status[]) {
  const l = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : `- ${NS}`);
  return `SUMMARY\n${r.summary}\n\nKEY POINTS\n${l(r.keyPoints)}\n\nDECISIONS\n${l(r.decisions)}\n\nACTION ITEMS\n${
    r.actionItems.length ? r.actionItems.map((a, i) => `- ${a.task} | Responsible: ${a.owner ?? NS} | Deadline: ${a.deadline ?? NS} | Status: ${statuses[i] ?? "Not started"}`).join("\n") : "- None"
  }\n\nDEADLINES\n${l(r.deadlines.map((d) => `${d.date} — ${d.item}`))}`;
}

type RecState = "idle" | "recording" | "paused";

function MeetingsPage() {
  const { settings, log } = useStore();
  const [tab, setTab] = useState("paste");
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // recording
  const rec = useRef<Awaited<ReturnType<typeof startRecorder>> | null>(null);
  const [recState, setRecState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [progress, setProgress] = useState("");
  const abort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recState !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recState]);

  useEffect(() => () => { rec.current?.cancel(); abort.current?.abort(); }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const setAudioFile = (f: File | null) => {
    setAudio(f);
    setAudioUrl(f ? URL.createObjectURL(f) : null);
    setTranscript("");
  };

  const startRec = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Recording isn't supported in this browser. Try uploading an audio file instead."); return; }
    try {
      rec.current = await startRecorder();
      setAudioFile(null); setSeconds(0); setRecState("recording");
    } catch (e) {
      setError(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow microphone access in your browser and try again."
        : errMsg(e));
    }
  };
  const pauseRec = () => { rec.current?.pause(); setRecState("paused"); };
  const resumeRec = () => { rec.current?.resume(); setRecState("recording"); };
  const stopRec = async () => {
    const r = rec.current; rec.current = null; setRecState("idle");
    if (!r) return;
    try { setAudioFile(await r.stop()); toast.success("Recording saved — ready to transcribe"); }
    catch (e) { setError(errMsg(e)); }
  };

  const onUpload = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/") && !/\.(mp3|wav|m4a|webm|ogg|aac|flac|mp4)$/i.test(f.name)) {
      setError("Please choose an audio file (MP3, WAV, M4A, WebM…)."); return;
    }
    if (f.size > 200 * 1024 * 1024) { setError("That file is over 200 MB. Please upload a shorter recording."); return; }
    setAudioFile(f);
  };

  const deleteAudio = () => { abort.current?.abort(); setAudioFile(null); setSeconds(0); setProgress(""); };
  const saveAudio = () => {
    if (!audio || !audioUrl) return;
    const a = document.createElement("a"); a.href = audioUrl; a.download = audio.name; a.click();
  };

  const runTranscribe = async () => {
    if (!audio) return;
    setTranscribing(true); setError(null); setTranscript(""); setProgress("Preparing audio…");
    const ctrl = new AbortController(); abort.current = ctrl;
    try {
      const text = await transcribeAudio(audio, (t, part, total) => {
        setTranscript(t);
        setProgress(total > 1 ? `Transcribing part ${part} of ${total}…` : "Transcribing…");
      }, ctrl.signal);
      setTranscript(text);
      toast.success("Transcript ready — review and edit before summarizing");
    } catch (e) {
      if (!ctrl.signal.aborted) setError(errMsg(e));
    } finally { setTranscribing(false); setProgress(""); }
  };

  const source = tab === "paste" ? notes : transcript;

  const run = async () => {
    if (source.trim().length < 20) {
      setError(tab === "paste" ? "Please paste at least a few sentences of meeting notes." : "Transcribe a recording first, or the transcript is too short to summarize.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const r = await summarizeMeeting({ data: { notes: source.slice(0, 30000), demo: settings.demoMode } });
      setResult(r);
      setStatuses(r.actionItems.map(() => "Not started"));
      log("meeting", `Summarized a meeting — ${r.actionItems.length} action item${r.actionItems.length === 1 ? "" : "s"}`);
      toast.success("Summary ready");
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  const clearAll = () => {
    if (recState !== "idle") { rec.current?.cancel(); rec.current = null; setRecState("idle"); }
    deleteAudio(); setNotes(""); setTranscript(""); setResult(null); setError(null);
  };

  const busy = loading || transcribing;

  return (
    <div className="space-y-6">
      <PageHeader title="Meeting Notes" description="Paste notes or record a meeting — get a summary, decisions and who does what." />
      <Card className="shadow-card">
        <CardContent className="space-y-4 pt-6">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
              <TabsTrigger value="paste"><NotebookPen className="mr-1.5 size-4" /> Paste notes</TabsTrigger>
              <TabsTrigger value="audio"><Mic className="mr-1.5 size-4" /> Record or upload</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notes">Meeting notes</Label>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setNotes(SAMPLE)}>Use sample notes</Button>
              </div>
              <Textarea id="notes" rows={12} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={30000} placeholder="Paste your meeting notes here…" />
            </TabsContent>

            <TabsContent value="audio" className="space-y-4 pt-2">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${recState === "recording" ? "animate-pulse bg-destructive" : recState === "paused" ? "bg-warning" : "bg-muted-foreground/40"}`} aria-hidden />
                    <span className="font-mono text-2xl tabular-nums" aria-live="polite">{fmtTime(seconds)}</span>
                    <Badge variant="outline" className="font-normal">
                      {recState === "recording" ? "Recording" : recState === "paused" ? "Paused" : audio ? "Recording ready" : "Not recording"}
                    </Badge>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {recState === "idle" && <Button onClick={startRec} disabled={busy}><Mic /> Record meeting</Button>}
                    {recState === "recording" && <Button variant="secondary" onClick={pauseRec}><Pause /> Pause</Button>}
                    {recState === "paused" && <Button variant="secondary" onClick={resumeRec}><Play /> Resume</Button>}
                    {recState !== "idle" && <Button variant="destructive" onClick={stopRec}><Square /> Stop</Button>}
                    {recState === "idle" && (
                      <>
                        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}><Upload /> Upload audio</Button>
                        <input ref={fileInput} type="file" accept="audio/*,video/mp4,video/webm" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
                      </>
                    )}
                  </div>
                </div>

                {audio && audioUrl && recState === "idle" && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FileAudio className="size-4 text-muted-foreground" />
                      <span className="truncate font-medium">{audio.name}</span>
                      <span className="text-muted-foreground">· {(audio.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <audio controls src={audioUrl} className="w-full" />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={runTranscribe} disabled={busy}>
                        {transcribing ? <Loader2 className="animate-spin" /> : <Wand2 />} {transcript ? "Transcribe again" : "Transcribe"}
                      </Button>
                      <Button variant="outline" onClick={saveAudio}><Download /> Save recording</Button>
                      <Button variant="outline" onClick={deleteAudio}><Trash2 /> Delete</Button>
                    </div>
                  </div>
                )}
              </div>

              {(transcribing || transcript) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="transcript">Transcript {transcribing ? "" : "— edit before summarizing"}</Label>
                    {transcribing && <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> {progress}</span>}
                  </div>
                  <Textarea id="transcript" rows={12} value={transcript} readOnly={transcribing} onChange={(e) => setTranscript(e.target.value)} placeholder="The transcript will appear here…" />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={busy || recState !== "idle"}>{loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Summarize</Button>
            <Button variant="outline" disabled={loading} onClick={clearAll}><Trash2 /> Clear</Button>
            <span className="ml-auto text-xs text-muted-foreground">{source.length.toLocaleString()} characters</span>
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
              <Button size="sm" variant="secondary" onClick={() => copyText(toText(result, statuses))}><Copy /> Copy</Button>
              <Button size="sm" variant="outline" onClick={run}><RefreshCw /> Regenerate</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed">{result.summary || NS}</p>
            <div className="grid gap-6 md:grid-cols-2">
              <List title="Key discussion points" items={result.keyPoints} />
              <List title="Decisions" items={result.decisions} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Action items</h3>
              {result.actionItems.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Responsible Person</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {result.actionItems.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell className="min-w-56">{a.task}</TableCell>
                          <TableCell className={a.owner ? "" : "italic text-muted-foreground"}>{a.owner ?? NS}</TableCell>
                          <TableCell className={a.deadline ? "" : "italic text-muted-foreground"}>{a.deadline ?? NS}</TableCell>
                          <TableCell className="min-w-36">
                            <Select value={statuses[i] ?? "Not started"} onValueChange={(v) => setStatuses((s) => s.map((x, k) => (k === i ? (v as Status) : x)))}>
                              <SelectTrigger className="h-8" aria-label={`Status for ${a.task}`}><SelectValue /></SelectTrigger>
                              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
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
        <EmptyState icon={<NotebookPen className="size-5" />} title="No summary yet" text="Missing people or deadlines are shown as “Not specified” — nothing is invented." />
      )}
      <Disclaimer compact />
    </div>
  );
}
