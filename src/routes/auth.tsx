import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Zap, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  beforeLoad: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = typeof window !== "undefined" && localStorage.getItem("focusync_guest_mode") === "true";
      if (session || isGuest) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if ((e as { to?: string })?.to) throw e;
    }
  },
});

function AuthPage() {
  const navigate = useNavigate();
  const { enterGuestMode } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGuest = () => {
    enterGuestMode();
    toast.success("Welcome, Alex! Demo student session activated.");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error("Sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Focus Sync!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero grid-pattern flex items-center justify-center px-4 py-12">
      <Link to="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary shadow-glow grid place-items-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Focus Sync</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin" ? "Sign in to keep your streak alive" : "Start focusing in seconds"}
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 shadow-elegant space-y-4">
          {/* Quick Demo Access */}
          <Button
            onClick={handleGuest}
            className="w-full h-11 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 border-0 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-accent" /> Explore Demo Account (1-Click Instant)
          </Button>

          <Button
            onClick={handleGoogle}
            disabled={googleLoading}
            variant="outline"
            className="w-full h-11 glass border-border hover:bg-secondary"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-card text-muted-foreground">or email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="h-11" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 border-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Sign in" : "Create account")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "New to Focus Sync?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-accent hover:underline font-medium">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
