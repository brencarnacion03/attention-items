import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GoalContribution, SavingsGoal } from "@/lib/types";
import { TabBar } from "@/components/TabBar";
import { AddGoalForm } from "./AddGoalForm";
import { GoalCard } from "./GoalCard";

export default async function GoalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: contributions } = await supabase
    .from("goal_contributions")
    .select("*")
    .order("contributed_at", { ascending: false })
    .order("created_at", { ascending: false });

  const contributionsByGoal = new Map<string, GoalContribution[]>();
  for (const contribution of (contributions ?? []) as GoalContribution[]) {
    contributionsByGoal.set(contribution.goal_id, [
      ...(contributionsByGoal.get(contribution.goal_id) ?? []),
      contribution,
    ]);
  }

  return (
    <main className="mx-auto max-w-2xl p-8 pb-28">
      <h1 className="font-display mb-6 text-2xl font-semibold text-sand-50">Savings goals</h1>

      <AddGoalForm />

      {(goals ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-sand-400/30 p-6 text-center text-sm text-sand-400">
          No goals yet. Add one above to start tracking progress.
        </p>
      ) : (
        <ul className="space-y-3">
          {(goals as SavingsGoal[]).map((goal) => (
            <GoalCard key={goal.id} goal={goal} contributions={contributionsByGoal.get(goal.id) ?? []} />
          ))}
        </ul>
      )}

      <TabBar active="goals" />
    </main>
  );
}
