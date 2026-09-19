import type { SupabaseClient } from "@supabase/supabase-js";
import { nextOccurrence, occurrenceSourceId, toISODate, urgencyForDueDate } from "./urgency";
import { sendReminderEmail } from "./email";
import type { RecurringBill } from "./types";

/**
 * Ensures this month's occurrence of a recurring bill exists as an
 * attention_item. Safe to call repeatedly: creates the row once, then only
 * refreshes its urgency (never its status) as long as the user hasn't acted
 * on it yet, so a dismissed/handled occurrence is never resurrected.
 */
export async function materializeOccurrence(
  supabase: SupabaseClient,
  userId: string,
  bill: Pick<RecurringBill, "id" | "title" | "type" | "amount" | "event_time" | "address">,
  dayOfMonth: number
) {
  const occurrence = nextOccurrence(dayOfMonth);
  const dueDate = toISODate(occurrence);
  const sourceId = occurrenceSourceId(bill.id, occurrence);
  const urgency = urgencyForDueDate(dueDate);

  const { data: existing } = await supabase
    .from("attention_items")
    .select("id, status")
    .eq("user_id", userId)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("attention_items").insert({
      user_id: userId,
      source: "manual",
      source_id: sourceId,
      type: bill.type,
      title: bill.title,
      due_date: dueDate,
      amount: bill.amount,
      event_time: bill.event_time,
      address: bill.address,
      urgency,
      status: "new",
      auto_handleable: false,
    });
    if (error) throw new Error(`materializeOccurrence insert failed: ${error.message}`);
  } else if (existing.status === "new") {
    const { error } = await supabase
      .from("attention_items")
      .update({ urgency })
      .eq("id", existing.id);
    if (error) throw new Error(`materializeOccurrence update failed: ${error.message}`);
  }

  return { dueDate };
}

/** Sends the reminder email for a bill's current occurrence, at most once per occurrence. */
export async function maybeSendReminder(
  admin: SupabaseClient,
  bill: RecurringBill,
  userEmail: string,
  dueDate: string
) {
  if (!bill.email_reminder) return;
  if (bill.last_reminded_for === dueDate) return;

  const daysUntil = Math.round(
    (new Date(dueDate + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  if (daysUntil > bill.reminder_days_before) return;

  await sendReminderEmail(userEmail, bill.title, dueDate);
  await admin.from("recurring_bills").update({ last_reminded_for: dueDate }).eq("id", bill.id);
}
