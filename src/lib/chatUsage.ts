import { createAdminClient } from "./supabase/admin";
import { currentMonthKey } from "./chat";

/** What the user has spent on chat so far this month (USD). */
export async function monthlySpend(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_usage")
    .select("cost_usd")
    .eq("user_id", userId)
    .eq("month", currentMonthKey())
    .maybeSingle();
  // Fail closed: without a readable usage record the spending cap can't be enforced.
  if (error) throw new Error(`chat usage unavailable: ${error.message}`);
  return Number(data?.cost_usd ?? 0);
}
