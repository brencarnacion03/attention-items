import { createAdminClient } from "./supabase/admin";
import { getAccessToken, fetchGmailCandidates, fetchCalendarCandidates } from "./google";
import { classifyCandidate } from "./anthropic";
import type { RawCandidate } from "./types";

export interface SyncResult {
  userId: string;
  scanned: number;
  added: number;
}

/** Polls Gmail + Calendar for one user, classifies new candidates, and upserts attention_items. */
export async function syncUser(userId: string): Promise<SyncResult> {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow?.refresh_token) {
    throw new Error(`No stored Google refresh token for user ${userId}`);
  }

  const accessToken = await getAccessToken(tokenRow.refresh_token);

  const [gmailCandidates, calendarCandidates] = await Promise.all([
    fetchGmailCandidates(accessToken),
    fetchCalendarCandidates(accessToken),
  ]);

  const candidates: RawCandidate[] = [...gmailCandidates, ...calendarCandidates];

  const { data: existing } = await admin
    .from("attention_items")
    .select("source_id")
    .eq("user_id", userId)
    .in("source_id", candidates.map((c) => c.source_id));

  const alreadyKnown = new Set((existing ?? []).map((row) => row.source_id));
  const newCandidates = candidates.filter((c) => !alreadyKnown.has(c.source_id));

  const classifications = await Promise.all(
    newCandidates.map(async (candidate) => ({ candidate, result: await classifyCandidate(candidate) }))
  );

  const rowsToInsert = classifications
    .filter(({ result }) => result.isAttentionItem)
    .map(({ candidate, result }) => ({
      user_id: userId,
      source: candidate.source,
      source_id: candidate.source_id,
      type: result.type!,
      title: result.title!,
      due_date: result.due_date,
      urgency: result.urgency!,
      status: "new" as const,
      auto_handleable: result.auto_handleable,
    }));

  if (rowsToInsert.length > 0) {
    await admin.from("attention_items").upsert(rowsToInsert, { onConflict: "user_id,source_id" });
  }

  await admin
    .from("sync_state")
    .upsert({ user_id: userId, last_synced_at: new Date().toISOString() });

  return { userId, scanned: candidates.length, added: rowsToInsert.length };
}

/** Runs syncUser for every user that has a stored Google refresh token. Used by the cron job. */
export async function syncAllUsers(): Promise<SyncResult[]> {
  const admin = createAdminClient();
  const { data: tokenRows } = await admin.from("google_tokens").select("user_id");

  const results: SyncResult[] = [];
  for (const row of tokenRows ?? []) {
    try {
      results.push(await syncUser(row.user_id));
    } catch (err) {
      console.error(`Sync failed for user ${row.user_id}:`, err);
    }
  }
  return results;
}
