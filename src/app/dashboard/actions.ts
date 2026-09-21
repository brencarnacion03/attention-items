"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { materializeOccurrence } from "@/lib/recurring";
import { urgencyForDueDate } from "@/lib/urgency";
import { getAccessToken, fetchGmailMessageDetail } from "@/lib/google";
import { draftReply } from "@/lib/anthropic";
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

function parseOptionalText(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

/** Pulls the bare address out of a "Name <email@x.com>" From header. */
function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader.trim();
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

export async function editItem(id: string, formData: FormData) {
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
  const eventTime = parseOptionalText(formData.get("event_time"));
  const address = parseOptionalText(formData.get("address"));

  const { error } = await supabase
    .from("attention_items")
    .update({
      title,
      type,
      due_date: dueDate,
      amount,
      event_time: eventTime,
      address,
      urgency: urgencyForDueDate(dueDate),
    })
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
  const eventTime = parseOptionalText(formData.get("event_time"));
  const address = parseOptionalText(formData.get("address"));

  const { error } = await supabase.from("attention_items").insert({
    user_id: user.id,
    source: "manual",
    type,
    title,
    due_date: dueDate,
    amount,
    event_time: eventTime,
    address,
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
  const dayOfMonth = Math.min(31, Math.max(1, Number(formData.get("day_of_month")) || 1));
  const emailReminder = formData.get("email_reminder") === "on";
  const amount = parseAmount(formData.get("amount"));
  const eventTime = parseOptionalText(formData.get("event_time"));
  const address = parseOptionalText(formData.get("address"));

  const { data: bill, error } = await supabase
    .from("recurring_bills")
    .insert({
      user_id: user.id,
      title,
      type,
      day_of_month: dayOfMonth,
      amount,
      event_time: eventTime,
      address,
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

export interface ReplyDraft {
  to: string;
  subject: string;
  body: string;
}

/** Drafts a reply for one auto-handleable emailed item by re-fetching that one
 * message from Gmail (its body isn't stored - classification only keeps a
 * snippet) and asking Claude to write a short reply. Never sends anything;
 * the caller opens the draft in the user's own mail client. */
export async function draftReplyForItem(itemId: string): Promise<ReplyDraft> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: item, error } = await supabase
    .from("attention_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();
  if (error || !item) throw new Error("Item not found.");
  if (item.source !== "gmail") throw new Error("Draft reply is only available for items synced from email.");

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tokenRow?.refresh_token) throw new Error("Google account not connected.");

  const accessToken = await getAccessToken(tokenRow.refresh_token);
  const detail = await fetchGmailMessageDetail(accessToken, item.source_id);

  const body = await draftReply({
    itemTitle: item.title,
    itemType: item.type,
    dueDate: item.due_date,
    originalSubject: detail.subject,
    originalFrom: detail.from,
    originalBody: detail.body,
  });
  if (!body) throw new Error("Could not draft a reply for this item.");

  return {
    to: extractEmailAddress(detail.from),
    subject: detail.subject.toLowerCase().startsWith("re:") ? detail.subject : `Re: ${detail.subject}`,
    body,
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
