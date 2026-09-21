"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleSignIn = async () => {
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        scopes:
          "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold italic text-sand-50">Attention Items</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm text-sand-400">
          Sign in with Google to scan your inbox and calendar for things that need your attention.
        </p>
      </div>
      <button
        onClick={handleSignIn}
        className="rounded-full bg-hunter-600 px-6 py-3 text-sm font-medium text-sand-50 shadow-[0_14px_32px_-16px_rgba(0,0,0,0.8)] transition-transform hover:bg-hunter-500 active:scale-90"
      >
        Sign in with Google
      </button>
    </main>
  );
}
