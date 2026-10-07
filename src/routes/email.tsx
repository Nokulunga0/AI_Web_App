import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Mail, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Disclaimer, EmptyState, ErrorState, LoadingState, PageHeader, SourceBadge, copyText, errMsg } from "@/components/common";
import { generateEmail } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import type { EmailResult } from "@/lib/types";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — Focusly" },
      { name: "description", content: "Generate professional emails in a formal, friendly or persuasive tone." },
      { property: "og:title", content: "Smart Email Generator — Focusly" },
      { property: "og:description", content: "Generate professional emails in a formal, friendly or persuasive tone." },
    ],
  }),
  component: EmailPage,
});

type Tone = "Formal" | "Friendly" | "Persuasive";

function EmailPage() {
  const { settings, log } = useStore();
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState<Tone>("Formal");
  const [result, setResult] = useState<EmailResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (purpose.trim().length < 5) {
      setError("Please describe the purpose of your email (at least 5 characters).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await generateEmail({ data: { purpose, tone, recipient: recipient || undefined, demo: settings.demoMode } });
      setResult(r);
      log("email", `Generated a ${tone.toLowerCase()} email: “${r.subject}”`);
      toast.success("Email generated");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setPurpose(""); setRecipient(""); setResult(null); setError(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Smart Email Generator" description="Describe what you need — get a polished subject and body." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient (optional)</Label>
              <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Professor Dlamini" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose / context</Label>
              <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={7} maxLength={3000}
                placeholder="e.g. Request a one-week extension for my research assignment due Friday because of a family emergency." />
            </div>
            <div className="space-y-2">
              <Label id="tone-label">Tone</Label>
              <ToggleGroup type="single" value={tone} onValueChange={(v) => v && setTone(v as Tone)} aria-labelledby="tone-label" className="justify-start" variant="outline">
                {(["Formal", "Friendly", "Persuasive"] as Tone[]).map((t) => <ToggleGroupItem key={t} value={t} className="px-4">{t}</ToggleGroupItem>)}
              </ToggleGroup>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={run} disabled={loading}><Sparkles /> Generate email</Button>
              <Button variant="outline" onClick={clear} disabled={loading}><Trash2 /> Clear</Button>
            </div>
            {error && <ErrorState message={error} />}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Your email</CardTitle>
            {result && <SourceBadge source={result.source} />}
          </CardHeader>
          <CardContent>
            {loading ? <LoadingState label="Writing your email…" /> : result ? (
              <div className="space-y-4 animate-rise">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                  <p className="mt-1 font-medium">{result.subject}</p>
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{result.body}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => copyText(`Subject: ${result.subject}\n\n${result.body}`)}><Copy /> Copy</Button>
                  <Button variant="outline" onClick={run}><RefreshCw /> Regenerate</Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={<Mail className="size-5" />} title="No email yet" text="Fill in the details and press Generate to see your draft here." />
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer compact />
    </div>
  );
}
