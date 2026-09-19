import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, IncomeDisplayEntry, RecurringBill, RecurringIncome } from "@/lib/types";
import { clampDayToMonth, occurrenceSourceId, toISODate, urgencyForDueDate } from "@/lib/urgency";
import { incomeOccurrencesInRange } from "@/lib/recurringIncome";
import { CalendarGrid, type CalendarEntry } from "./CalendarGrid";
import { IncomeSection } from "./IncomeSection";
import { TabBar } from "@/components/TabBar";

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

  const { data: incomeEntries } = await supabase
    .from("income_entries")
    .select("*")
    .gte("received_date", rangeStart)
    .lte("received_date", rangeEnd)
    .order("received_date", { ascending: true });

  const { data: recurringIncome } = await supabase.from("recurring_income").select("*");

  const incomeDisplayEntries: IncomeDisplayEntry[] = (incomeEntries ?? []).map((entry) => ({
    id: entry.id,
    title: entry.title,
    amount: entry.amount,
    date: entry.received_date,
    recurring: false,
    removeId: entry.id,
  }));

  // Project each recurring paycheck onto every date it lands on within this
  // month, so the user only has to enter it once instead of every period.
  for (const rule of (recurringIncome ?? []) as RecurringIncome[]) {
    for (const date of incomeOccurrencesInRange(rule.start_date, rule.frequency, rangeStart, rangeEnd)) {
      incomeDisplayEntries.push({
        id: `recurring-income-${rule.id}-${date}`,
        title: rule.title,
        amount: rule.amount,
        date,
        recurring: true,
        removeId: rule.id,
      });
    }
  }

  incomeDisplayEntries.sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = incomeDisplayEntries.reduce((sum, entry) => sum + entry.amount, 0);

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
    const day = clampDayToMonth(year, monthIndex, bill.day_of_month);
    const occurrence = new Date(year, monthIndex, day);
    const dueDate = toISODate(occurrence);
    const sourceId = occurrenceSourceId(bill.id, occurrence);
    if (seenSourceIds.has(sourceId)) continue;

    byDay.set(day, [
      ...(byDay.get(day) ?? []),
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
    <main className="mx-auto max-w-3xl p-4 pb-28 sm:p-8">
      <div className="mb-4">
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`/calendar?month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}`}
            className="shrink-0 rounded-full px-2 py-1 text-xs transition-transform active:scale-90 sm:text-sm"
          >
            &larr; Prev
          </Link>
          <h1 className="text-base font-semibold sm:text-lg">{monthLabel}</h1>
          <Link
            href={`/calendar?month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}`}
            className="shrink-0 rounded-full px-2 py-1 text-xs transition-transform active:scale-90 sm:text-sm"
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
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium">Total for {monthLabel}</span>
          <span className="text-sm font-semibold text-red-600">{formatDollars(monthTotal)}</span>
        </div>
      )}

      <IncomeSection entries={incomeDisplayEntries} defaultDate={rangeStart} monthLabel={monthLabel} />

      {(monthTotal > 0 || totalIncome > 0) && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-neutral-800 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium">Net for {monthLabel}</span>
          <span
            className={`text-sm font-semibold ${
              totalIncome - monthTotal >= 0 ? "text-green-500" : "text-red-600"
            }`}
          >
            {formatDollars(totalIncome - monthTotal)}
          </span>
        </div>
      )}

      <TabBar active="calendar" />
    </main>
  );
}
