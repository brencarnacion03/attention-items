import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, RecurringBill, Urgency } from "@/lib/types";
import { ItemRow } from "./ItemRow";
import { SyncButton } from "./SyncButton";
import { AddItemForm } from "./AddItemForm";
import { RecurringBillsList } from "./RecurringBillsList";
import { signOut } from "./actions";

const URGENCY_ORDER: Urgency[] = ["red", "yellow", "green", "blue"];
const URGENCY_LABEL: Record<Urgency, string> = {
  red: "Urgent",
  yellow: "Soon",
  green: "Later",
  blue: "FYI",
};
const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("attention_items")
    .select("*")
    .eq("status", "new")
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data: recurringBills } = await supabase
    .from("recurring_bills")
    .select("*")
    .order("day_of_month", { ascending: true });

  const grouped = new Map<Urgency, AttentionItem[]>();
  for (const urgency of URGENCY_ORDER) grouped.set(urgency, []);
  for (const item of (items ?? []) as AttentionItem[]) {
    grouped.get(item.urgency)?.push(item);
  }

  const total = items?.length ?? 0;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {total} {total === 1 ? "thing needs" : "things need"} your attention
          </h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="text-xs text-neutral-500 underline">
            Calendar
          </Link>
          <SyncButton />
          <form action={signOut}>
            <button className="text-xs text-neutral-500 underline">Sign out</button>
          </form>
        </div>
      </div>

      <AddItemForm />
      <RecurringBillsList bills={(recurringBills ?? []) as RecurringBill[]} />

      {total === 0 && (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Nothing pending. Hit &quot;Sync now&quot; to scan your inbox and calendar.
        </p>
      )}

      <div className="space-y-6">
        {URGENCY_ORDER.map((urgency) => {
          const group = grouped.get(urgency) ?? [];
          if (group.length === 0) return null;
          return (
            <section key={urgency}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">
                <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[urgency]}`} />
                {URGENCY_LABEL[urgency]} ({group.length})
              </h2>
              <ul className="space-y-2">
                {group.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
