import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Focusly" },
      { name: "description", content: "Personalize your name, working hours and AI demo mode." },
      { property: "og:title", content: "Settings — Focusly" },
      { property: "og:description", content: "Personalize your name, working hours and AI demo mode." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, resetAll } = useStore();
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Changes are saved automatically on this device." />
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={settings.name} maxLength={50} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Used in your dashboard greeting" />
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Working hours</CardTitle>
          <CardDescription>Schedules are planned inside this window.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="ws">Start</Label><Input id="ws" type="time" value={settings.workStart} onChange={(e) => updateSettings({ workStart: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="we">End</Label><Input id="we" type="time" value={settings.workEnd} onChange={(e) => updateSettings({ workEnd: e.target.value })} /></div>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">AI</CardTitle></CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="demo">Demo mode</Label>
            <p className="mt-1 text-sm text-muted-foreground">Use built-in sample responses instead of the live AI. Handy for offline presentations.</p>
          </div>
          <Switch id="demo" checked={settings.demoMode} onCheckedChange={(v) => updateSettings({ demoMode: v })} />
        </CardContent>
      </Card>
      <Card className="border-destructive/30 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Reset data</CardTitle>
          <CardDescription>Clears tasks, schedules, activity and counters, and restores the sample tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => { if (confirm("Reset all data on this device?")) { resetAll(); toast.success("Data reset"); } }}>Reset all data</Button>
        </CardContent>
      </Card>
    </div>
  );
}
