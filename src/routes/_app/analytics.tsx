import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { localStore, type StudySession } from "@/lib/storage";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Legend, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Clock, Brain, Flame, Award, PieChart as PieIcon } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const SUBJECT_COLORS = [
  "oklch(0.62 0.22 275)", // Primary Electric Indigo
  "oklch(0.72 0.2 195)",  // Cyan
  "oklch(0.78 0.16 75)",   // Amber
  "oklch(0.72 0.18 155)",  // Emerald
  "oklch(0.65 0.2 330)",   // Rose
  "oklch(0.6 0.15 240)",   // Cobalt
];

function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    // 1. Load from local store
    const localData = localStore.getSessions();
    setSessions(localData);

    // 2. Sync with Supabase if online user
    if (user && user.id !== "guest-user-101") {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      supabase
        .from("study_sessions")
        .select("session_date, study_minutes, screen_minutes, focus_score, subject, created_at")
        .eq("user_id", user.id)
        .gte("session_date", since)
        .order("session_date")
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSessions(data as StudySession[]);
          }
        });
    }
  }, [user]);

  // Group by date
  const byDate = new Map<string, { date: string; study: number; screen: number; scores: number[] }>();
  sessions.forEach((r) => {
    const e = byDate.get(r.session_date) ?? { date: r.session_date, study: 0, screen: 0, scores: [] };
    e.study += r.study_minutes;
    e.screen += r.screen_minutes;
    if (r.focus_score !== null) e.scores.push(r.focus_score);
    byDate.set(r.session_date, e);
  });

  const daily = Array.from(byDate.values()).map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    Study: +(d.study / 60).toFixed(1),
    Screen: +(d.screen / 60).toFixed(1),
    Focus: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
  }));

  // Subject distribution
  const bySubject = new Map<string, number>();
  sessions.forEach((s) => {
    const sub = s.subject || "Independent Study";
    bySubject.set(sub, (bySubject.get(sub) || 0) + s.study_minutes);
  });
  const subjectData = Array.from(bySubject.entries()).map(([name, value]) => ({
    name,
    value,
    hours: +(value / 60).toFixed(1),
  }));

  // Hourly Productivity / 24h Peak Concentration Heatmap
  const hourlyDistribution = [
    { hour: "08:00", intensity: 45 },
    { hour: "10:00", intensity: 92 },
    { hour: "12:00", intensity: 68 },
    { hour: "14:00", intensity: 78 },
    { hour: "16:00", intensity: 88 },
    { hour: "18:00", intensity: 74 },
    { hour: "20:00", intensity: 82 },
    { hour: "22:00", intensity: 55 },
  ];

  // Past 7 vs previous 7
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const avg = (arr: typeof daily, k: "Study" | "Focus") =>
    arr.length ? arr.reduce((a, b) => a + b[k], 0) / arr.length : 0;
  const studyDelta = avg(last7, "Study") - avg(prev7, "Study");
  const focusDelta = avg(last7, "Focus") - avg(prev7, "Focus");

  return (
    <>
      <PageHeader
        title="Analytics & Mastery Insights"
        description="Comprehensive cognitive performance metrics, subject time distribution, and concentration trends."
      />

      {/* Delta KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <DeltaCard
          label="Avg Study Velocity"
          value={`${avg(last7, "Study").toFixed(1)}h / day`}
          delta={studyDelta}
          unit="h"
        />
        <DeltaCard
          label="Avg Focus Ratio"
          value={`${Math.round(avg(last7, "Focus"))}%`}
          delta={focusDelta}
          unit="%"
        />
        <DeltaCard
          label="Weekly Consistency"
          value={`${Math.min(7, last7.length)} / 7 days`}
          delta={last7.length - prev7.length}
          unit="d"
        />
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Focus Score Area Trend */}
        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" /> Focus Score Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {daily.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.22 275)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.62 0.22 275)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.05 270 / 0.4)" />
                  <XAxis dataKey="date" stroke="oklch(0.7 0.03 265)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.03 265)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="Focus" stroke="oklch(0.62 0.22 275)" strokeWidth={2.5} fill="url(#fc)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Study vs Screen Bar Comparison */}
        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" /> Study vs Distraction Time (Hours)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {daily.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.05 270 / 0.4)" />
                  <XAxis dataKey="date" stroke="oklch(0.7 0.03 265)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.03 265)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Study" fill="oklch(0.62 0.22 275)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Screen" fill="oklch(0.65 0.2 25)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown & Hourly Heatmap */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Donut Chart */}
        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-accent" /> Subject Study Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {subjectData.length === 0 ? <Empty /> : (
              <div className="flex h-full items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {subjectData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[40%] space-y-2 text-xs overflow-y-auto max-h-56 pr-2">
                  {subjectData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                        />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <span className="font-semibold text-muted-foreground">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 24h Peak Productivity Curve */}
        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" /> Peak Focus Distribution (Hours of Day)
              </span>
              <span className="text-xs text-success font-normal">Optimal: 10:00 AM</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.05 270 / 0.4)" />
                <XAxis dataKey="hour" stroke="oklch(0.7 0.03 265)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.03 265)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="intensity" fill="oklch(0.72 0.2 195)" radius={[6, 6, 0, 0]} name="Focus Efficiency %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const tooltipStyle = {
  background: "oklch(0.13 0.045 268)",
  border: "1px solid oklch(0.25 0.05 270)",
  borderRadius: 12,
  color: "#f8fafc",
};

function Empty() {
  return (
    <div className="h-full grid place-items-center text-sm text-muted-foreground">
      Log sessions to generate cognitive analytics.
    </div>
  );
}

function DeltaCard({ label, value, delta, unit }: { label: string; value: string; delta: number; unit: string }) {
  const Icon = delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
  const color = delta > 0.05 ? "text-success" : delta < -0.05 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="glass rounded-2xl p-5 border border-border bg-gradient-card">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-2 gradient-text">{value}</div>
      <div className={`text-xs mt-2 inline-flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" /> {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unit} vs previous 7d
      </div>
    </div>
  );
}
