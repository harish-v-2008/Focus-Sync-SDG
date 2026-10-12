import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { localStore } from "@/lib/storage";
import { toast } from "sonner";
import { Save, Flame, Trophy, Award, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState("4.5");
  const [streak, setStreak] = useState(7);
  const [longest, setLongest] = useState(14);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1. Load from local store
    const local = localStore.getProfile();
    setName(local.full_name || "Alex Vance");
    setExamName(local.exam_name || "MCAT / USMLE Finals");
    setExamDate(local.exam_date || "");
    setHours(String(local.daily_goal_hours || 4.5));
    setStreak(local.current_streak || 7);
    setLongest(local.longest_streak || 14);

    // 2. Sync with Supabase if online
    if (user && user.id !== "guest-user-101") {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        if (data.full_name) setName(data.full_name);
        if (data.exam_name) setExamName(data.exam_name);
        if (data.exam_date) setExamDate(data.exam_date);
        if (data.daily_goal_hours) setHours(String(data.daily_goal_hours));
        if (data.current_streak) setStreak(data.current_streak);
        if (data.longest_streak) setLongest(data.longest_streak);
      });
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    const dailyGoal = parseFloat(hours) || 4.5;

    // 1. Save locally
    localStore.updateProfile({
      full_name: name || "Student",
      exam_name: examName,
      exam_date: examDate,
      daily_goal_hours: dailyGoal,
    });

    // 2. Save to Supabase if authenticated
    if (user && user.id !== "guest-user-101") {
      try {
        await supabase.from("profiles").update({
          full_name: name || null,
          exam_name: examName || null,
          exam_date: examDate || null,
          daily_goal_hours: dailyGoal,
        }).eq("id", user.id);
      } catch {
        // local update succeeded
      }
    }

    setSaving(false);
    toast.success("Profile and study targets updated successfully!");
  };

  return (
    <>
      <PageHeader
        title="Student Profile"
        description="Exam targets, daily study velocity, streak history, and personalized goals."
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card className="lg:col-span-2 glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Academic Target & Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email Account</Label>
                <Input value={user?.email ?? "alex.focus@example.com"} disabled className="mt-1 opacity-60" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Target Exam / Standardized Test</Label>
                <Input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. USMLE, MCAT, JEE, SAT, Bar Exam"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Target Exam Date</Label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Daily Focus Goal (Hours)</Label>
              <Input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="mt-1 max-w-[180px]"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Used by MIRA to automatically generate your balanced daily study missions.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={save}
                disabled={saving}
                className="bg-gradient-primary border-0 shadow-glow"
              >
                <Save className="h-4 w-4 mr-1.5" /> Save Target Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Streak & Consistency Card */}
        <div className="space-y-6">
          <Card className="glass border-border bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" /> Study Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="text-6xl font-bold gradient-text">{streak}</div>
              <div className="text-sm text-muted-foreground mt-1 font-medium">Days Active Streak</div>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                Keep studying at least 30 minutes every day to prevent your streak from resetting.
              </p>

              <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-2 gap-2">
                <div className="glass rounded-xl p-3 border border-border/40">
                  <div className="text-xl font-bold text-foreground">{longest}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Longest Record</div>
                </div>
                <div className="glass rounded-xl p-3 border border-border/40">
                  <div className="text-xl font-bold text-success flex items-center justify-center gap-1">
                    <Award className="h-4 w-4" /> Top 5%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Global Cohort</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
