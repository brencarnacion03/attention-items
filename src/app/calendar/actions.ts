"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clampDayToMonth, urgencyForDueDate } from "@/lib/urgency";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateAll() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/spending");
}

export async function addIncomeEntry(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount.");
  }
  const title = String(formData.get("title") ?? "").trim() || null;
  const receivedDate = (formData.get("received_date") as string) || null;
  if (!receivedDate) throw new Error("Date is required.");

  const { error } = await supabase.from("income_entries").insert({
    user_id: user.id,
    title,
    amount,
    received_date: receivedDate,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function deleteIncomeEntry(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function addRecurringIncome(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount.");
  }
  const title = String(formData.get("title") ?? "").trim() || null;
  const frequency = String(formData.get("frequency") ?? "");
  if (frequency !== "weekly" && frequency !== "biweekly") {
    throw new Error("Choose how often this paycheck repeats.");
  }
  const startDate = (formData.get("start_date") as string) || null;
  if (!startDate) throw new Error("Start date is required.");

  const { error } = await supabase.from("recurring_income").insert({
    user_id: user.id,
    title,
    amount,
    frequency,
    start_date: startDate,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function deleteRecurringIncome(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("recurring_income")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

/** Removes one item from the calendar by dismissing it (and clearing its amount so it
 * stops counting toward spending). Dismissing rather than deleting the row is
 * deliberate: attention_items has no DELETE policy, and a dismissed row also can't be
 * re-created by the next Gmail/Calendar sync or recurring-bill cron run. */
export async function deleteCalendarItem(itemId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("attention_items")
    .update({ status: "dismissed", amount: null })
    .eq("id", itemId)
    .eq("user_id", user.id)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Item not found.");
  revalidateAll();
}

/** Removes a single month's occurrence of a recurring bill, leaving the series intact. */
export async function skipRecurringOccurrence(billId: string, sourceId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (!UUID_RE.test(billId) || !new RegExp(`^recurring-${billId}-\\d{4}-\\d{2}$`).test(sourceId)) {
    throw new Error("Invalid recurring occurrence.");
  }

  const { data: bill } = await supabase
    .from("recurring_bills")
    .select("id, title, type, day_of_month, event_time, address")
    .eq("id", billId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bill) throw new Error("Recurring bill not found.");

  const { data: existing } = await supabase
    .from("attention_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("attention_items")
      .update({ status: "dismissed", amount: null })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    // No row yet (the calendar only projects this month from the rule), so leave a
    // dismissed placeholder that materializeOccurrence and the calendar both respect.
    const [year, month] = sourceId.slice(-7).split("-").map(Number);
    const day = clampDayToMonth(year, month - 1, bill.day_of_month);
    const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const { error } = await supabase.from("attention_items").insert({
      user_id: user.id,
      source: "manual",
      source_id: sourceId,
      type: bill.type,
      title: bill.title,
      due_date: dueDate,
      amount: null,
      event_time: bill.event_time,
      address: bill.address,
      urgency: urgencyForDueDate(dueDate),
      status: "dismissed",
      auto_handleable: false,
    });
    if (error) throw new Error(error.message);
  }
  revalidateAll();
}

/** Stops a recurring bill entirely: deletes the rule and dismisses its still-open occurrences.
 * Already-handled months stay as history. */
export async function deleteRecurringSeries(billId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (!UUID_RE.test(billId)) throw new Error("Invalid recurring bill.");

  const { error: dismissError } = await supabase
    .from("attention_items")
    .update({ status: "dismissed", amount: null })
    .eq("user_id", user.id)
    .eq("status", "new")
    .like("source_id", `recurring-${billId}-%`);
  if (dismissError) throw new Error(dismissError.message);

  const { error } = await supabase.from("recurring_bills").delete().eq("id", billId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateAll();
}
