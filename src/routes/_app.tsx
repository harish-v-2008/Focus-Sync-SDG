import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = typeof window !== "undefined" && localStorage.getItem("focusync_guest_mode") === "true";
      if (!session && !isGuest) throw redirect({ to: "/auth" });
    } catch (e) {
      if ((e as { to?: string })?.to) throw e;
      const isGuest = typeof window !== "undefined" && localStorage.getItem("focusync_guest_mode") === "true";
      if (!isGuest) throw redirect({ to: "/auth" });
    }
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
