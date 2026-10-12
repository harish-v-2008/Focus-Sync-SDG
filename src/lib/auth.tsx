import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const guestStored = typeof window !== "undefined" && localStorage.getItem("focusync_guest_mode") === "true";
    setIsGuest(guestStored);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const enterGuestMode = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("focusync_guest_mode", "true");
      setIsGuest(true);
    }
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("focusync_guest_mode");
      setIsGuest(false);
    }
    await supabase.auth.signOut();
  };

  const syntheticGuestUser: User = {
    id: "guest-user-101",
    app_metadata: {},
    user_metadata: { full_name: "Alex Vance" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "alex.focus@example.com",
    role: "authenticated",
  } as User;

  const currentUser = session?.user ?? (isGuest ? syntheticGuestUser : null);

  return (
    <AuthContext.Provider value={{ user: currentUser, session, loading, isGuest, signOut, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
