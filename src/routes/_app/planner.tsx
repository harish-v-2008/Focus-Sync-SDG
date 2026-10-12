import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generatePlan } from "@/api/mira.functions";
import { localStore, type Mission } from "@/lib/storage";
import { Sparkles, Loader2, Trash2, Timer, RefreshCw, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gen = useServerFn(generatePlan);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [subjects, setSubjects] = useState("Biology, Organic Chemistry, Physics");
  const [hours, setHours] = useState("4");
  const [loading, setLoading] = useState(false);

  // Quick add form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDuration, setNewDuration] = useState("30");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");

  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    // 1. Load from local store
    const localData = localStore.getMissions(today);
    setMissions(localData);

    // 2. Sync with Supabase if logged in
    if (user && user.id !== "guest-user-101") {
      const { data } = await supabase
        .from("missions")
        .select("id, title, subject, priority, duration_minutes, completed, due_date, created_at")
        .eq("user_id", user.id)
        .eq("due_date", today)
        .order("created_at");
      if (data && data.length > 0) {
        setMissions(data as Mission[]);
      }
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line

  const generate = async () => {
    setLoading(true);
    let examName = "Upcoming Exam";
    let days: number | undefined = 30;

    if (user && user.id !== "guest-user-101") {
      const { data: profile } = await supabase.from("profiles").select("exam_name, exam_date").eq("id", user.id).maybeSingle();
      if (profile) {
        examName = profile.exam_name || examName;
        days = profile.exam_date ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000)) : undefined;
      }
    } else {
      const p = localStore.getProfile();
      examName = p.exam_name;
      days = p.exam_date ? Math.max(0, Math.ceil((new Date(p.exam_date).getTime() - Date.now()) / 86400000)) : 30;
    }

    try {
      const result = await gen({
        data: {
          examName,
          daysToExam: days,
          subjects,
          hoursPerDay: parseFloat(hours) || 4,
        },
      });

      if (result.error || !result.missions?.length) {
        toast.error(result.error || "No plan generated");
        setLoading(false);
        return;
      }

      const rows: Mission[] = result.missions.map((m: { title: string; subject: string; priority: "high" | "medium" | "low"; duration_minutes: number }, idx: number) => ({
        id: `m-gen-${Date.now()}-${idx}`,
        user_id: user?.id,
        title: m.title,
        subject: m.subject,
        priority: m.priority || "medium",
        duration_minutes: m.duration_minutes || 30,
        completed: false,
        due_date: today,
        created_at: new Date().toISOString(),
      }));

      // Save locally
      localStore.saveMissions(rows);

      // Save to Supabase if authenticated
      if (user && user.id !== "guest-user-101") {
        await supabase.from("missions").insert(
          rows.map((r) => ({
            user_id: user.id,
            title: r.title,
            subject: r.subject,
            priority: r.priority,
            duration_minutes: r.duration_minutes,
            due_date: today,
          }))
        );
      }

      toast.success("MIRA generated your personalized daily missions!");
      load();
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (m: Mission) => {
    localStore.toggleMission(m.id);
    if (user && user.id !== "guest-user-101") {
      await supabase.from("missions").update({ completed: !m.completed }).eq("id", m.id);
    }
    load();
  };

  const remove = async (id: string) => {
    localStore.deleteMission(id);
    if (user && user.id !== "guest-user-101") {
      await supabase.from("missions").delete().eq("id", id);
    }
    load();
    toast.info("Mission removed");
  };

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: Mission = {
      id: "m-custom-" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject.trim() || "General",
      priority: newPriority,
      duration_minutes: parseInt(newDuration) || 30,
      completed: false,
      due_date: today,
      created_at: new Date().toISOString(),
    };
    localStore.saveMissions([item]);
    if (user && user.id !== "guest-user-101") {
      supabase.from("missions").insert({
        user_id: user.id,
        title: item.title,
        subject: item.subject,
        priority: item.priority,
        duration_minutes: item.duration_minutes,
        due_date: today,
      }).then();
    }
    toast.success("Mission added!");
    setNewTitle("");
    setNewSubject("");
    setShowAddModal(false);
    load();
  };

  const startFocusSession = (mission: Mission) => {
    toast.info(`Starting Pomodoro focus for ${mission.subject || "Study"}...`);
    navigate({ to: "/timer" });
  };

  const done = missions.filter((m) => m.completed).length;
  const totalMins = missions.reduce((acc, m) => acc + (m.duration_minutes || 0), 0);
  const doneMins = missions.filter((m) => m.completed).reduce((acc, m) => acc + (m.duration_minutes || 0), 0);

  return (
    <>
      <PageHeader
        title="AI Planner"
        description="Adaptive study scheduling tuned to your exam syllabus, weak spots, and daily velocity."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(!showAddModal)}
              className="glass border-border text-xs gap-1.5 hover:bg-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={loading}
              className="glass border-border text-xs gap-1.5 hover:bg-secondary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Recalibrate
            </Button>
          </div>
        }
      />

      {showAddModal && (
        <Card className="glass border-border bg-gradient-card mb-5 animate-in fade-in slide-in-from-top-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Add Custom Study Mission</span>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground text-xs">Close</button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addManual} className="grid sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <Label className="text-xs">Task Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Solve 20 past exam problems" required />
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Biology" />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={5} max={300} value={newDuration} onChange={(e) => setNewDuration(e.target.value)} />
              </div>
              <div className="sm:col-span-4 flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-gradient-primary border-0 shadow-glow">Add Mission</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="glass border-border bg-gradient-card mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> MIRA Adaptive Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Target Subjects (comma separated)</Label>
              <Input
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Biology, Organic Chemistry, Physics"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Available Hours Today</Label>
              <Input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={generate} disabled={loading} className="bg-gradient-primary border-0 shadow-glow">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "MIRA is optimizing schedule..." : "Generate Adaptive Missions"}
            </Button>
            <p className="text-xs text-muted-foreground hidden sm:block">
              MIRA calculates optimal intervals and balances high-yield problem solving.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border bg-gradient-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              Today's Missions
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-accent font-normal">
                {done} of {missions.length} completed
              </span>
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Progress: <strong className="text-foreground">{doneMins}m</strong> / {totalMins}m scheduled
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No missions scheduled for today.</p>
              <Button onClick={generate} size="sm" className="mt-4 bg-gradient-primary border-0 shadow-glow">
                Generate with MIRA
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {missions.map((m) => {
                const isHigh = m.priority === "high";
                const isMed = m.priority === "medium";
                const badgeColor = isHigh
                  ? "bg-destructive/20 text-destructive border-destructive/30"
                  : isMed
                  ? "bg-warning/20 text-warning border-warning/30"
                  : "bg-primary/20 text-accent border-primary/30";

                return (
                  <div
                    key={m.id}
                    className={`glass rounded-xl p-4 flex items-center gap-3 transition-smooth border border-border/50 hover:border-border ${
                      m.completed ? "opacity-60 bg-secondary/30" : "hover:shadow-glow"
                    }`}
                  >
                    <Checkbox
                      checked={m.completed}
                      onCheckedChange={() => toggle(m)}
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-medium text-sm truncate ${
                            m.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {m.title}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${badgeColor}`}>
                          {m.priority}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span>{m.subject || "General"}</span>
                        <span>•</span>
                        <span>{m.duration_minutes} mins</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!m.completed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startFocusSession(m)}
                          className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/20 text-accent"
                          title="Start timer for this task"
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Focus</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(m.id)}
                        className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
