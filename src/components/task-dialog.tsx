import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Priority, Task } from "@/lib/types";

export type TaskDraft = Omit<Task, "id" | "createdAt" | "completed">;
const empty: TaskDraft = { name: "", description: "", priority: "Medium", duration: 60, deadline: "", category: "Study" };

export function TaskDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: Task | null; onSave: (t: TaskDraft) => void;
}) {
  const [d, setD] = useState<TaskDraft>(empty);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) { setD(initial ? { ...initial } : empty); setErr(""); }
  }, [open, initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return setErr("Task name is required.");
    if (!d.duration || d.duration < 5 || d.duration > 1440) return setErr("Duration must be between 5 and 1440 minutes.");
    onSave({ ...d, name: d.name.trim(), category: d.category.trim() || "General" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Task name</Label>
            <Input id="t-name" value={d.name} maxLength={120} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" rows={3} value={d.description} maxLength={500} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-pri">Priority</Label>
              <Select value={d.priority} onValueChange={(v) => setD({ ...d, priority: v as Priority })}>
                <SelectTrigger id="t-pri"><SelectValue /></SelectTrigger>
                <SelectContent>{["High", "Medium", "Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-dur">Duration (minutes)</Label>
              <Input id="t-dur" type="number" min={5} max={1440} step={5} value={d.duration} onChange={(e) => setD({ ...d, duration: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-dl">Deadline</Label>
              <Input id="t-dl" type="date" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-cat">Category</Label>
              <Input id="t-cat" value={d.category} maxLength={40} onChange={(e) => setD({ ...d, category: e.target.value })} />
            </div>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initial ? "Save changes" : "Add task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
