import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, RecurringBill } from "@/lib/types";
import { occurrenceSourceId, toISODate, urgencyForDueDate } from "@/lib/urgency";
import { CalendarGrid, type CalendarEntry } from "./CalendarGrid";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parseMonthParam(month: string | undefined): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-").map(Number);
    return { year, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParam(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year, monthIndex } = parseMonthParam(searchParams.month);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const rangeStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const rangeEnd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: items } = await supabase
    .from("attention_items")
    .select("*")
    .gte("due_date", rangeStart)
    .lte("due_date", rangeEnd)
    .neq("status", "dismissed");

  const { data: recurringBills } = await supabase.from("recurring_bills").select("*");

  const byDay = new Map<number, CalendarEntry[]>();
  const seenSourceIds = new Set<string>();

  for (const item of (items ?? []) as AttentionItem[]) {
    if (!item.due_date) continue;
    seenSourceIds.add(item.source_id);
    const day = Number(item.due_date.slice(8, 10));
    byDay.set(day, [
      ...(byDay.get(day) ?? []),
      { id: item.id, title: item.title, urgency: item.urgency, amount: item.amount },
    ]);
  }

  // Project each recurring bill onto its day in this month too, even for
  // months that haven't been materialized into attention_items yet (or won't
  // be, if the occurrence is in the past) - the calendar shows the recurring
  // rule itself, not just the one "currently actionable" occurrence.
  for (const bill of (recurringBills ?? []) as RecurringBill[]) {
    const occurrence = new Date(year, monthIndex, bill.day_of_month);
    const dueDate = toISODate(occurrence);
    const sourceId = occurrenceSourceId(bill.id, occurrence);
    if (seenSourceIds.has(sourceId)) continue;

    byDay.set(bill.day_of_month, [
      ...(byDay.get(bill.day_of_month) ?? []),
      { id: sourceId, title: bill.title, urgency: urgencyForDueDate(dueDate), amount: bill.amount },
    ]);
  }

  const monthTotal = Array.from(byDay.values())
    .flat()
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const entriesByDay = Object.fromEntries(byDay);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-4">
        <Link href="/dashboard" className="text-xs text-neutral-500 underline sm:text-sm">
          &larr; Back to dashboard
        </Link>
        <div className="mt-2 flex items-center justify-center gap-4">
          <Link
            href={`/calendar?month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}`}
            className="shrink-0 text-xs sm:text-sm"
          >
            &larr; Prev
          </Link>
          <h1 className="text-base font-semibold sm:text-lg">{monthLabel}</h1>
          <Link
            href={`/calendar?month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}`}
            className="shrink-0 text-xs sm:text-sm"
          >
            Next &rarr;
          </Link>
        </div>
      </div>

      <p className="mb-3 text-center text-xs text-neutral-500 sm:text-left">
        Click any date to add an item.
      </p>

      <CalendarGrid year={year} monthIndex={monthIndex} cells={cells} entriesByDay={entriesByDay} />

      {monthTotal > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3">
          <span className="text-sm font-medium">Total for {monthLabel}</span>
          <span className="text-sm font-semibold text-red-600">{formatDollars(monthTotal)}</span>
        </div>
      )}
    </main>
  );
}
