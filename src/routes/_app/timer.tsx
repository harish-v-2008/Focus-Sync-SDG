import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Coffee, Brain, Volume2, Sparkles, Music } from "lucide-react";
import { useTimer, DEFAULT_PRESETS, type AmbientTrack } from "@/lib/timer-context";

export const Route = createFileRoute("/_app/timer")({
  component: TimerPage,
});

function TimerPage() {
  const {
    running,
    mode,
    preset,
    seconds,
    subject,
    completed,
    ambientTrack,
    volume,
    start,
    pause,
    reset,
    choosePreset,
    setSubject,
    setAmbientTrack,
    setVolume,
  } = useTimer();

  const total = mode === "focus" ? preset.focus * 60 : preset.brk * 60;
  const pct = ((total - seconds) / total) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <PageHeader
        title="Focus Timer"
        description="Persistent background Pomodoro timer. Keeps ticking and playing audio even when navigating to other pages."
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Main Countdown Display */}
        <Card className="lg:col-span-2 glass border-border bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              {mode === "focus" ? <Brain className="h-5 w-5 text-accent" /> : <Coffee className="h-5 w-5 text-warning" />}
              {mode === "focus" ? "Focus" : "Break"} · {preset.label}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-normal">
                {subject}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="oklch(0.2 0.05 270)" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={mode === "focus" ? "url(#g)" : "oklch(0.78 0.16 75)"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 282.7} 282.7`}
                  style={{ transition: "stroke-dasharray 0.5s linear" }}
                />
                <defs>
                  <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="oklch(0.62 0.22 275)" />
                    <stop offset="100%" stopColor="oklch(0.72 0.2 285)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{mm}:{ss}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                    {completed} completed today
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-8">
              <Button
                onClick={running ? pause : start}
                className="bg-gradient-primary border-0 shadow-glow h-12 px-8 text-base font-semibold"
              >
                {running ? <><Pause className="h-4 w-4 mr-1.5" /> Pause</> : <><Play className="h-4 w-4 mr-1.5" /> Start Focus</>}
              </Button>
              <Button onClick={reset} variant="outline" className="glass border-border h-12 px-6">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-8">
              {DEFAULT_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  onClick={() => choosePreset(p)}
                  variant={preset.label === p.label ? "default" : "outline"}
                  className={preset.label === p.label ? "bg-gradient-primary border-0 shadow-glow" : "glass border-border"}
                >
                  {p.label}
                  <span className="text-xs ml-1 opacity-70">
                    {p.focus}/{p.brk}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ambient Audio & Target Subject Settings */}
        <div className="space-y-6">
          <Card className="glass border-border bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="h-4 w-4 text-accent" /> Focus Audio Synthesizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Soundscape</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "none", label: "Mute" },
                    { id: "alpha", label: "432Hz Alpha" },
                    { id: "white", label: "White Noise" },
                    { id: "rain", label: "Gentle Rain" },
                  ].map((track) => (
                    <Button
                      key={track.id}
                      size="sm"
                      variant={ambientTrack === track.id ? "default" : "outline"}
                      onClick={() => setAmbientTrack(track.id as AmbientTrack)}
                      className={ambientTrack === track.id ? "bg-gradient-primary border-0 text-xs" : "glass border-border text-xs"}
                    >
                      {track.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Volume</span>
                  <span>{volume}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={(val) => setVolume(val[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Synthesized in-browser via Web Audio API. Stays active in the background across navigation.
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Active Subject Tag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label className="text-xs text-muted-foreground">Logged with this session</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Cellular Biology, Calculus"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Biology", "Chemistry", "Physics", "Math", "Literature"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className="text-[11px] px-2 py-0.5 rounded-md glass border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-smooth"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
