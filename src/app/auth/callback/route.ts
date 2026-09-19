import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Google only returns a refresh token on the first consent, or when we force
  // prompt=consent (see login page). Store it so the sync job can call the
  // Gmail/Calendar APIs later without the user being present.
  const providerRefreshToken = (data.session as unknown as { provider_refresh_token?: string })
    .provider_refresh_token;

  if (providerRefreshToken) {
    const admin = createAdminClient();
    await admin.from("google_tokens").upsert({
      user_id: data.user.id,
      refresh_token: providerRefreshToken,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
