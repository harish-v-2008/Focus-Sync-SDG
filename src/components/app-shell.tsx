import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTimer } from "@/lib/timer-context";
import {
  LayoutDashboard, Target, Camera, Timer, ListChecks, LineChart,
  Sparkles, MessageSquare, User, Info, LogOut, Zap, Menu, X, BookOpen,
  Brain, Coffee, Play, Pause, Maximize2
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/focus", label: "Focus Score", icon: Target },
  { to: "/camera", label: "Camera", icon: Camera },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/tracker", label: "Tracker", icon: ListChecks },
  { to: "/mastery", label: "Mastery (SRS)", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/planner", label: "Planner", icon: Sparkles },
  { to: "/chatbot", label: "MIRA", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/about", label: "About", icon: Info },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { running, mode, seconds, subject, start, pause } = useTimer();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-glow grid place-items-center">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">Focus Sync</span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-smooth ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              {label === "Timer" && running && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-bold tabular-nums shadow-glow animate-pulse">
                  {mm}:{ss}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="px-3 py-2 mb-1">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-sm font-medium truncate">{user?.email || "alex.focus@example.com"}</div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm gap-3 hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 glass-strong border-b border-border h-14 px-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold">Focus Sync</span>
        </Link>
        <div className="flex items-center gap-2">
          {running && path !== "/timer" && (
            <Link
              to="/timer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass border border-accent/40 text-accent text-xs font-bold tabular-nums"
            >
              <div className="h-2 w-2 rounded-full bg-accent animate-ping" />
              {mm}:{ss}
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-30">
        {SidebarContent}
      </aside>

      {/* Sidebar — mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="lg:pl-64 min-h-screen">
        <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 max-w-7xl">
          {children}
        </div>
      </main>

      {/* Persistent Floating Mini-Timer Widget (when outside /timer) */}
      {path !== "/timer" && running && (
        <div className="fixed bottom-5 right-5 z-50 glass-strong rounded-2xl p-3 shadow-elegant border border-border/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Link to="/timer" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              {mode === "focus" ? (
                <Brain className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Coffee className="h-4 w-4 text-warning" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums text-foreground flex items-center gap-1.5">
                {mm}:{ss}
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-normal uppercase">
                  {mode}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[110px]">{subject}</div>
            </div>
          </Link>
          <div className="h-6 w-px bg-border/60" />
          <Button
            size="icon"
            variant="ghost"
            onClick={running ? pause : start}
            className="h-8 w-8 hover:bg-secondary rounded-lg"
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Link to="/timer">
            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs glass border-border hover:bg-secondary gap-1">
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">Open</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
