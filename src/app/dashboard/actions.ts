"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { materializeOccurrence } from "@/lib/recurring";
import { urgencyForDueDate } from "@/lib/urgency";
import type { ItemStatus, ItemType } from "@/lib/types";

const ITEM_TYPES: ItemType[] = [
  "bill",
  "renewal",
  "appointment",
  "deadline",
  "reservation",
  "document",
];

function parseItemType(value: FormDataEntryValue | null): ItemType {
  return ITEM_TYPES.includes(value as ItemType) ? (value as ItemType) : "bill";
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function setItemStatus(id: string, status: ItemStatus) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  // RLS also scopes this to the signed-in user; the explicit filter here is belt-and-suspenders.
  const { error } = await supabase
    .from("attention_items")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function addOneTimeItem(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const type = parseItemType(formData.get("type"));
  const dueDate = (formData.get("due_date") as string) || null;
  const amount = parseAmount(formData.get("amount"));

  const { error } = await supabase.from("attention_items").insert({
    user_id: user.id,
    source: "manual",
    type,
    title,
    due_date: dueDate,
    amount,
    urgency: urgencyForDueDate(dueDate),
    status: "new",
    auto_handleable: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function addRecurringBill(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const type = parseItemType(formData.get("type"));
  const dayOfMonth = Math.min(28, Math.max(1, Number(formData.get("day_of_month")) || 1));
  const emailReminder = formData.get("email_reminder") === "on";
  const amount = parseAmount(formData.get("amount"));

  const { data: bill, error } = await supabase
    .from("recurring_bills")
    .insert({
      user_id: user.id,
      title,
      type,
      day_of_month: dayOfMonth,
      amount,
      email_reminder: emailReminder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Show the current occurrence right away instead of waiting for tomorrow's cron run.
  await materializeOccurrence(supabase, user.id, bill, dayOfMonth);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function deleteRecurringBill(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("recurring_bills")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
