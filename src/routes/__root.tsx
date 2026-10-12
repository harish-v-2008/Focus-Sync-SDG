import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { TimerProvider } from "@/lib/timer-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl p-10">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in focus mode</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:scale-105"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Focus Sync — Don't Scroll Your Dreams Away" },
      { name: "description", content: "AI-powered productivity ecosystem with study tracking, webcam attention monitoring, intelligent planning, and MIRA chatbot." },
      { property: "og:title", content: "Focus Sync — Don't Scroll Your Dreams Away" },
      { property: "og:description", content: "AI-powered productivity ecosystem with study tracking, webcam attention monitoring, intelligent planning, and MIRA chatbot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Focus Sync — Don't Scroll Your Dreams Away" },
      { name: "twitter:description", content: "AI-powered productivity ecosystem with study tracking, webcam attention monitoring, intelligent planning, and MIRA chatbot." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5faa65c9-c365-4f0f-80ca-c22090bc5564/id-preview-ede2f2bb--4911e459-79d8-41c1-b3a7-e0a47fa4e298.lovable.app-1777898539719.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5faa65c9-c365-4f0f-80ca-c22090bc5564/id-preview-ede2f2bb--4911e459-79d8-41c1-b3a7-e0a47fa4e298.lovable.app-1777898539719.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <TimerProvider>
        <Outlet />
        <Toaster />
      </TimerProvider>
    </AuthProvider>
  );
}
