import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser, syncAllUsers } from "@/lib/sync";

// Classifying a wider calendar window means more Claude calls per sync;
// give this more room than the platform's default before it's cut off.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    const results = await syncAllUsers();
    return NextResponse.json({ mode: "cron", results });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const result = await syncUser(user.id);
    return NextResponse.json({ mode: "manual", result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron sends GET requests.
export async function GET(request: NextRequest) {
  return POST(request);
}
