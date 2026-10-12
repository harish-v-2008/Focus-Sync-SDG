import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { localStore } from "@/lib/storage";
import { toast } from "sonner";
import { Calculator, Save, Sparkles, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/focus")({
  component: FocusPage,
});

function FocusPage() {
  const { user } = useAuth();
  const [studyHours, setStudyHours] = useState("3");
  const [studyMins, setStudyMins] = useState("15");
  const [screenHours, setScreenHours] = useState("1");
  const [screenMins, setScreenMins] = useState("20");
  const [score, setScore] = useState<number | null>(71);
  const [saving, setSaving] = useState(false);

  // Auto-fill from today's tracked sessions on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const sessions = localStore.getSessions().filter((s) => s.session_date === today);
    if (sessions.length > 0) {
      const totStudy = sessions.reduce((a, s) => a + (s.study_minutes || 0), 0);
      const totScreen = sessions.reduce((a, s) => a + (s.screen_minutes || 0), 0);
      setStudyHours(String(Math.floor(totStudy / 60)));
      setStudyMins(String(totStudy % 60));
      setScreenHours(String(Math.floor(totScreen / 60)));
      setScreenMins(String(totScreen % 60));
      if (totStudy + totScreen > 0) {
        setScore(Math.round((totStudy / (totStudy + totScreen)) * 100));
      }
    }
  }, []);

  const calculate = () => {
    const study = parseInt(studyHours || "0") * 60 + parseInt(studyMins || "0");
    const screen = parseInt(screenHours || "0") * 60 + parseInt(screenMins || "0");
    if (study + screen === 0) {
      toast.error("Enter at least some study or screen time");
      return;
    }
    const computed = Math.round((study / (study + screen)) * 100);
    setScore(computed);
    toast.success(`Focus ratio calculated: ${computed}%!`);
  };

  const autoFillFromToday = () => {
    const today = new Date().toISOString().split("T")[0];
    const sessions = localStore.getSessions().filter((s) => s.session_date === today);
    const totStudy = sessions.reduce((a, s) => a + (s.study_minutes || 0), 0);
    const totScreen = sessions.reduce((a, s) => a + (s.screen_minutes || 0), 0);
    setStudyHours(String(Math.floor(totStudy / 60)));
    setStudyMins(String(totStudy % 60));
    setScreenHours(String(Math.floor(totScreen / 60)));
    setScreenMins(String(totScreen % 60));
    if (totStudy + totScreen > 0) {
      setScore(Math.round((totStudy / (totStudy + totScreen)) * 100));
      toast.success("Synchronized with today's live tracker data!");
    } else {
      toast.info("No sessions logged today yet. Using current values.");
    }
  };

  const save = async () => {
    if (score === null) return;
    setSaving(true);
    const study = parseInt(studyHours || "0") * 60 + parseInt(studyMins || "0");
    const screen = parseInt(screenHours || "0") * 60 + parseInt(screenMins || "0");

    localStore.addSession({
      user_id: user?.id,
      study_minutes: study,
      screen_minutes: screen,
      focus_score: score,
      subject: "Daily Focus Summary",
      notes: "Calculated daily ratio",
      session_date: new Date().toISOString().split("T")[0],
    });

    if (user && user.id !== "guest-user-101") {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        study_minutes: study,
        screen_minutes: screen,
        focus_score: score,
        notes: "Focus score calculator",
      });
    }

    setSaving(false);
    toast.success("Focus score saved to your permanent tracker!");
  };

  const study = parseInt(studyHours || "0") * 60 + parseInt(studyMins || "0");
  const screen = parseInt(screenHours || "0") * 60 + parseInt(screenMins || "0");
  const pieData = [
    { name: "Productive Study", value: Math.max(1, study), color: "oklch(0.62 0.22 275)" },
    { name: "Screen Distraction", value: Math.max(1, screen), color: "oklch(0.65 0.2 25)" },
  ];
  const barData = [{ name: "Today", Study: +(study / 60).toFixed(1), Screen: +(screen / 60).toFixed(1) }];

  const category = score === null ? null : score >= 70 ? "Focused" : score >= 40 ? "Improving" : "Distracted";
  const catColor = category === "Focused" ? "text-success" : category === "Improving" ? "text-warning" : "text-destructive";
  const suggestion =
    category === "Focused"
      ? "Outstanding deep work ratio! Maintain this momentum and keep your streak alive."
      : category === "Improving"
      ? "Solid progress. Increase active recall blocks and minimize background notifications."
      : "High screen ratio detected. Launch a 25-minute Pomodoro session with 432Hz alpha audio now.";

  return (
    <>
      <PageHeader
        title="Focus Score"
        description="Calculate your deep work vs digital distraction ratio and receive actionable cognitive recommendations."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={autoFillFromToday}
            className="glass border-border text-xs gap-1.5 hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Pull Today's Live Time
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-accent" /> Time Allocation Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs mb-1.5 block text-muted-foreground font-medium">Deep Work Study Time</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input type="number" min={0} value={studyHours} onChange={(e) => setStudyHours(e.target.value)} placeholder="Hours" />
                  <div className="text-[11px] text-muted-foreground mt-1">Hours</div>
                </div>
                <div>
                  <Input type="number" min={0} max={59} value={studyMins} onChange={(e) => setStudyMins(e.target.value)} placeholder="Minutes" />
                  <div className="text-[11px] text-muted-foreground mt-1">Minutes</div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block text-muted-foreground font-medium">Non-Productive Screen Time (Social / Video)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input type="number" min={0} value={screenHours} onChange={(e) => setScreenHours(e.target.value)} placeholder="Hours" />
                  <div className="text-[11px] text-muted-foreground mt-1">Hours</div>
                </div>
                <div>
                  <Input type="number" min={0} max={59} value={screenMins} onChange={(e) => setScreenMins(e.target.value)} placeholder="Minutes" />
                  <div className="text-[11px] text-muted-foreground mt-1">Minutes</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={calculate} className="flex-1 bg-gradient-primary text-primary-foreground border-0 shadow-glow font-semibold">
                Calculate Focus Score
              </Button>
              {score !== null && (
                <Button onClick={save} disabled={saving} variant="outline" className="glass border-border hover:bg-secondary">
                  <Save className="h-4 w-4 mr-1.5" /> Save
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Focus Ratio & Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {score === null ? (
              <div className="h-64 grid place-items-center text-muted-foreground text-sm">
                Enter times and calculate to view score.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="text-6xl font-bold gradient-text">{score}%</div>
                  <div className={`text-base font-semibold mt-1.5 ${catColor}`}>{category}</div>
                  <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">{suggestion}</p>
                </div>

                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "oklch(0.13 0.045 268)", border: "1px solid oklch(0.25 0.05 270)", borderRadius: 12, color: "#f8fafc" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {score !== null && (
        <Card className="mt-6 glass border-border bg-gradient-card max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Hours Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="oklch(0.7 0.03 265)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.03 265)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.13 0.045 268)", border: "1px solid oklch(0.25 0.05 270)", borderRadius: 12, color: "#f8fafc" }} />
                <Legend />
                <Bar dataKey="Study" fill="oklch(0.62 0.22 275)" radius={[6, 6, 0, 0]} name="Study Hours" />
                <Bar dataKey="Screen" fill="oklch(0.65 0.2 25)" radius={[6, 6, 0, 0]} name="Screen Hours" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
