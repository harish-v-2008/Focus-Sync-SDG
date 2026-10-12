import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Download, Search, Sparkles, Filter, Clock, Target, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { localStore, type StudySession } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tracker")({
  component: TrackerPage,
});

function TrackerPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [study, setStudy] = useState("60");
  const [screen, setScreen] = useState("20");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");

  const load = async () => {
    // 1. Load local store first
    const localData = localStore.getSessions();
    setSessions(localData);

    // 2. Sync with Supabase
    if (user && user.id !== "guest-user-101") {
      const { data } = await supabase
        .from("study_sessions")
        .select("id, study_minutes, screen_minutes, subject, focus_score, session_date, notes, created_at")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        setSessions(data as StudySession[]);
      }
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line

  const add = async () => {
    const s = parseInt(study || "0");
    const sc = parseInt(screen || "0");
    if (s + sc === 0) return toast.error("Enter time first");
    const focus_score = s + sc > 0 ? Math.round((s / (s + sc)) * 100) : null;
    const sessionDate = new Date().toISOString().split("T")[0];

    // Add to local store
    localStore.addSession({
      user_id: user?.id,
      study_minutes: s,
      screen_minutes: sc,
      subject: subject.trim() || "Independent Study",
      focus_score,
      notes: notes.trim() || null,
      session_date: sessionDate,
    });

    // Add to Supabase if authenticated
    if (user && user.id !== "guest-user-101") {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        study_minutes: s,
        screen_minutes: sc,
        subject: subject.trim() || "Independent Study",
        focus_score,
        notes: notes.trim() || null,
        session_date: sessionDate,
      });
    }

    toast.success("Study session logged successfully!");
    setStudy("60");
    setScreen("20");
    setSubject("");
    setNotes("");
    load();
  };

  const remove = async (id: string) => {
    localStore.deleteSession(id);
    if (user && user.id !== "guest-user-101") {
      await supabase.from("study_sessions").delete().eq("id", id);
    }
    load();
    toast.info("Session removed");
  };

  const exportCSV = () => {
    if (sessions.length === 0) return toast.error("No sessions to export");
    const headers = "Date,Subject,StudyMinutes,ScreenMinutes,FocusScore,Notes\n";
    const rows = sessions
      .map(
        (s) =>
          `"${s.session_date}","${s.subject || "General"}","${s.study_minutes}","${s.screen_minutes}","${
            s.focus_score ?? ""
          }","${(s.notes || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `focusync_study_history_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV export downloaded!");
  };

  // Filtered list
  const filteredSessions = sessions.filter((s) => {
    const matchesSubject =
      selectedSubjectFilter === "all" ||
      (s.subject || "").toLowerCase() === selectedSubjectFilter.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (s.subject || "").toLowerCase().includes(query) ||
      (s.notes || "").toLowerCase().includes(query);
    return matchesSubject && matchesSearch;
  });

  // Calculate summary metrics
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.study_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const validScores = sessions.filter((s) => s.focus_score !== null).map((s) => s.focus_score as number);
  const avgFocus = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;

  // Extract unique subjects for filter pills
  const subjectsList = Array.from(
    new Set(sessions.map((s) => s.subject || "General").filter(Boolean))
  );

  return (
    <>
      <PageHeader
        title="Study Tracker"
        description="Persistent study session history, subject categorization, and productivity log."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="glass border-border text-xs gap-1.5 hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export History (CSV)
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
            <span>Total Study Time</span>
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="text-3xl font-bold mt-2 gradient-text">{totalHours}h</div>
          <div className="text-xs text-muted-foreground mt-1">{totalMinutes} minutes logged</div>
        </div>

        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
            <span>Average Focus Score</span>
            <Target className="h-4 w-4 text-accent" />
          </div>
          <div className="text-3xl font-bold mt-2 text-accent">{avgFocus}%</div>
          <div className="text-xs text-muted-foreground mt-1">Study vs Screen time ratio</div>
        </div>

        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
            <span>Total Recorded Sessions</span>
            <Calendar className="h-4 w-4 text-accent" />
          </div>
          <div className="text-3xl font-bold mt-2 text-foreground">{sessions.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Logged across all devices</div>
        </div>
      </div>

      {/* Log a Session Card */}
      <Card className="glass border-border bg-gradient-card mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" /> Log a Study Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Subject / Topic</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Organic Chemistry, Calculus"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Study (mins)</Label>
              <Input
                type="number"
                min={0}
                value={study}
                onChange={(e) => setStudy(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Screen / Distraction (mins)</Label>
              <Input
                type="number"
                min={0}
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="w-full bg-gradient-primary border-0 shadow-glow h-10">
                <Plus className="h-4 w-4 mr-1" /> Log
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions History List with Search & Filter */}
      <Card className="glass border-border bg-gradient-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              Recent Sessions ({filteredSessions.length})
            </CardTitle>
            <div className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subjects, notes..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Subject Filter Pills */}
          {subjectsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3">
              <button
                onClick={() => setSelectedSubjectFilter("all")}
                className={`text-xs px-2.5 py-1 rounded-lg transition-smooth ${
                  selectedSubjectFilter === "all"
                    ? "bg-gradient-primary text-primary-foreground font-medium shadow-glow"
                    : "glass border border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Subjects
              </button>
              {subjectsList.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubjectFilter(sub)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-smooth ${
                    selectedSubjectFilter.toLowerCase() === sub.toLowerCase()
                      ? "bg-gradient-primary text-primary-foreground font-medium shadow-glow"
                      : "glass border border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No matching sessions found. Log your first block above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className="glass rounded-xl p-4 flex items-center justify-between transition-smooth border border-border/50 hover:border-border hover:shadow-glow"
                >
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{s.subject ?? "Independent Study"}</span>
                      {s.notes && (
                        <span className="text-xs text-muted-foreground font-normal">
                          · {s.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span>{new Date(s.session_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span>{s.study_minutes} min study</span>
                      <span>•</span>
                      <span>{s.screen_minutes} min screen</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.focus_score !== null && (
                      <span className="text-sm font-bold gradient-text">{s.focus_score}%</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(s.id)}
                      className="hover:bg-destructive/20 hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
