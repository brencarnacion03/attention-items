import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, RecurringBill, Urgency } from "@/lib/types";
import { ItemRow } from "./ItemRow";
import { SyncButton } from "./SyncButton";
import { AddItemForm } from "./AddItemForm";
import { RecurringBillsList } from "./RecurringBillsList";
import { signOut } from "./actions";
import { TabBar } from "@/components/TabBar";

const URGENCY_ORDER: Urgency[] = ["red", "yellow", "green", "blue"];
const URGENCY_LABEL: Record<Urgency, string> = {
  red: "Urgent",
  yellow: "Soon",
  green: "Later",
  blue: "FYI",
};
// Distinguished by icon shape rather than a rainbow of colors, so the list
// stays within the app's hunter/sand palette - only genuinely urgent items
// get the (already-established) red accent.
const URGENCY_COLOR: Record<Urgency, string> = {
  red: "text-red-500",
  yellow: "text-[#d99a3c]",
  green: "text-hunter-400",
  blue: "text-sand-500",
};

function UrgencyIcon({ urgency, className }: { urgency: Urgency; className?: string }) {
  switch (urgency) {
    case "red":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 3.5 22 20H2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 9.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "yellow":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5V12l3.2 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "green":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="2" />
          <path d="M8 13.5l2.4 2.4L16 10.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="8.3" r="1.1" fill="currentColor" stroke="none" />
          <path d="M12 11.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

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
    <main className="mx-auto max-w-2xl p-8 pb-28">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {total} {total === 1 ? "thing needs" : "things need"} your attention
          </h1>
          <p className="text-sm text-sand-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
          <form action={signOut}>
            <button className="text-xs text-sand-400 underline transition-transform active:scale-90">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <AddItemForm />
      <RecurringBillsList bills={(recurringBills ?? []) as RecurringBill[]} />

      {total === 0 && (
        <p className="rounded-md border border-dashed border-sand-400/30 p-6 text-center text-sm text-sand-400">
          Nothing pending. Hit &quot;Sync now&quot; to scan your inbox and calendar.
        </p>
      )}

      <div className="space-y-6">
        {URGENCY_ORDER.map((urgency) => {
          const group = grouped.get(urgency) ?? [];
          if (group.length === 0) return null;
          return (
            <section key={urgency}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sand-500">
                <UrgencyIcon urgency={urgency} className={`h-4 w-4 shrink-0 ${URGENCY_COLOR[urgency]}`} />
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

      <TabBar active="dashboard" />
    </main>
  );
}
