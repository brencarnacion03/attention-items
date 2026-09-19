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
        <h1 className="text-2xl font-semibold">Attention Items</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in with Google to scan your inbox and calendar for things that need your attention.
        </p>
      </div>
      <button
        onClick={handleSignIn}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Sign in with Google
      </button>
    </main>
  );
}
