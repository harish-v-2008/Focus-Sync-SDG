import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Camera, Target, Sparkles, MessageSquare, LineChart, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHeader title="About Focus Sync" description="An AI productivity ecosystem for serious learners." />

      <Card className="glass border-border bg-gradient-card mb-5">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary shadow-glow grid place-items-center"><Zap className="h-5 w-5 text-primary-foreground" /></div>
            <h2 className="text-2xl font-bold">Don't scroll your dreams away.</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Focus Sync combines real-time webcam attention monitoring, AI-powered planning, intelligent analytics,
            and a 24/7 AI tutor (MIRA) into one workspace — built to help students convert distraction into discipline.
          </p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: Camera, t: "Camera Concentration", d: "Real-time face detection scores attention while you study." },
          { icon: Target, t: "Focus Score", d: "Convert study vs screen time into a clear daily score." },
          { icon: Brain, t: "AI Planner", d: "MIRA generates daily missions tuned to your exam." },
          { icon: MessageSquare, t: "MIRA Chatbot", d: "Ask any concept, get instant tutor-grade explanations." },
          { icon: Sparkles, t: "Streak System", d: "Stay consistent with a daily streak counter." },
          { icon: LineChart, t: "Smart Analytics", d: "Past vs present comparison and weekly trends." },
        ].map((f) => (
          <div key={f.t} className="glass rounded-2xl p-5 border border-border bg-gradient-card">
            <f.icon className="h-5 w-5 text-accent mb-3" />
            <div className="font-semibold">{f.t}</div>
            <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">© 2026 Focus Sync. Built with MIRA Cognitive AI Engine.</p>
    </>
  );
}
