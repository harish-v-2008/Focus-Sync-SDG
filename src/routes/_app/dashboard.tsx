import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { localStore } from "@/lib/storage";
import { Target, Flame, CalendarClock, Sparkles, ArrowRight, Camera, Timer, MessageSquare, BookOpen, Layers } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface Profile {
  full_name: string | null;
  exam_name: string | null;
  exam_date: string | null;
  current_streak: number | null;
  daily_goal_hours: number | null;
}

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todayScreen, setTodayScreen] = useState(0);
  const [missionsTotal, setMissionsTotal] = useState(0);
  const [missionsDone, setMissionsDone] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    // 1. Load from local store immediately
    const localProf = localStore.getProfile();
    setProfile(localProf);

    const localSessions = localStore.getSessions().filter((s) => s.session_date === today);
    setTodayMinutes(localSessions.reduce((a, s) => a + (s.study_minutes ?? 0), 0));
    setTodayScreen(localSessions.reduce((a, s) => a + (s.screen_minutes ?? 0), 0));

    const localMissions = localStore.getMissions(today);
    setMissionsTotal(localMissions.length);
    setMissionsDone(localMissions.filter((x) => x.completed).length);

    // 2. Sync with Supabase if logged in with real account
    if (user && user.id !== "guest-user-101") {
      (async () => {
        try {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, exam_name, exam_date, current_streak, daily_goal_hours")
            .eq("id", user.id)
            .maybeSingle();
          if (p) setProfile(p);

          const { data: sessions } = await supabase
            .from("study_sessions")
            .select("study_minutes, screen_minutes")
            .eq("user_id", user.id)
            .eq("session_date", today);
          if (sessions && sessions.length > 0) {
            setTodayMinutes(sessions.reduce((a, s) => a + (s.study_minutes ?? 0), 0));
            setTodayScreen(sessions.reduce((a, s) => a + (s.screen_minutes ?? 0), 0));
          }

          const { data: m } = await supabase
            .from("missions")
            .select("completed")
            .eq("user_id", user.id)
            .eq("due_date", today);
          if (m && m.length > 0) {
            setMissionsTotal(m.length);
            setMissionsDone(m.filter((x) => x.completed).length);
          }
        } catch {
          // Keep local store fallback
        }
      })();
    }
  }, [user]);

  const goalMin = (profile?.daily_goal_hours ?? 4) * 60;
  const goalPct = Math.min(100, Math.round((todayMinutes / goalMin) * 100));
  const focusScore = todayMinutes + todayScreen > 0 ? Math.round((todayMinutes / (todayMinutes + todayScreen)) * 100) : 85;
  const daysToExam = profile?.exam_date ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000)) : null;

  return (
    <>
      <PageHeader
        title={`Hey ${profile?.full_name?.split(" ")[0] ?? "Alex"} 👋`}
        description="Here's your cognitive focus snapshot and exam readiness for today."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Target}
          label="Today's Focus Score"
          value={`${focusScore}%`}
          hint={focusScore >= 70 ? "Focused 🔥" : focusScore >= 40 ? "Improving" : "Let's go!"}
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${profile?.current_streak ?? 7} days`}
          hint="Consistent momentum"
        />
        <StatCard
          icon={CalendarClock}
          label="Exam Countdown"
          value={daysToExam !== null ? `${daysToExam} d` : "45 d"}
          hint={profile?.exam_name ?? "MCAT / USMLE Finals"}
        />
        <StatCard
          icon={Sparkles}
          label="Today's Missions"
          value={`${missionsDone} / ${missionsTotal}`}
          hint={missionsTotal === 0 ? "Generate plan" : "Completed today"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 glass border-border bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Daily Study Target
              <span className="text-sm font-normal text-muted-foreground">
                {(todayMinutes / 60).toFixed(1)}h / {profile?.daily_goal_hours ?? 4.5}h goal
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={goalPct} className="h-3" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="glass rounded-xl p-4 border border-border/50">
                <div className="text-xs text-muted-foreground">Productive Study</div>
                <div className="text-2xl font-bold mt-1 gradient-text">{(todayMinutes / 60).toFixed(1)}h</div>
              </div>
              <div className="glass rounded-xl p-4 border border-border/50">
                <div className="text-xs text-muted-foreground">Distraction / Screen</div>
                <div className="text-2xl font-bold mt-1">{(todayScreen / 60).toFixed(1)}h</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Focus Command Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <QuickLink to="/timer" icon={Timer} label="Launch Pomodoro Timer" />
            <QuickLink to="/camera" icon={Camera} label="Webcam Concentration" />
            <QuickLink to="/mastery" icon={BookOpen} label="Mastery & Spaced Recall" />
            <QuickLink to="/chatbot" icon={MessageSquare} label="Ask MIRA AI Tutor" />
            <QuickLink to="/planner" icon={Sparkles} label="Adaptive Study Planner" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <div className="glass border border-border rounded-2xl p-5 bg-gradient-card transition-smooth hover:shadow-glow">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="text-3xl font-bold mt-2 gradient-text">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to as "/timer"}>
      <Button variant="outline" className="w-full justify-between glass border-border hover:bg-secondary h-10 text-xs">
        <span className="inline-flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-accent" />
          {label}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </Link>
  );
}
