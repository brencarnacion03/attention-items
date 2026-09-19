"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
