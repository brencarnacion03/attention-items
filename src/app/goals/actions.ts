"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addGoal(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const targetAmountRaw = String(formData.get("target_amount") ?? "").trim();
  const targetAmount = Number(targetAmountRaw);
  if (!targetAmountRaw || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error("Enter a valid target amount.");
  }

  const targetDate = (formData.get("target_date") as string) || null;

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    title,
    target_amount: targetAmount,
    target_date: targetDate,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function addMoneyToGoal(goalId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: goal, error: fetchError } = await supabase
    .from("savings_goals")
    .select("current_amount")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !goal) throw new Error("Goal not found.");

  const { error } = await supabase
    .from("savings_goals")
    .update({ current_amount: goal.current_amount + amount })
    .eq("id", goalId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const { error: logError } = await supabase.from("goal_contributions").insert({
    user_id: user.id,
    goal_id: goalId,
    amount,
  });
  if (logError) throw new Error(logError.message);

  revalidatePath("/goals");
}

export async function deleteContribution(contributionId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: contribution, error: fetchError } = await supabase
    .from("goal_contributions")
    .select("goal_id, amount")
    .eq("id", contributionId)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !contribution) throw new Error("Contribution not found.");

  const { error: deleteError } = await supabase
    .from("goal_contributions")
    .delete()
    .eq("id", contributionId)
    .eq("user_id", user.id);
  if (deleteError) throw new Error(deleteError.message);

  const { data: goal, error: goalFetchError } = await supabase
    .from("savings_goals")
    .select("current_amount")
    .eq("id", contribution.goal_id)
    .eq("user_id", user.id)
    .single();
  if (goalFetchError || !goal) throw new Error("Goal not found.");

  const { error: updateError } = await supabase
    .from("savings_goals")
    .update({ current_amount: Math.max(0, goal.current_amount - contribution.amount) })
    .eq("id", contribution.goal_id)
    .eq("user_id", user.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/goals");
}
