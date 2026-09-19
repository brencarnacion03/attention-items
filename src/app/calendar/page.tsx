import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, RecurringBill, Urgency } from "@/lib/types";
import { occurrenceSourceId, toISODate, urgencyForDueDate } from "@/lib/urgency";

const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

interface CalendarEntry {
  id: string;
  title: string;
  urgency: Urgency;
  amount: number | null;
}

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

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-neutral-500 underline">
          Back to dashboard
        </Link>
        <h1 className="text-lg font-semibold">{monthLabel}</h1>
        <div className="flex gap-3 text-sm">
          <Link href={`/calendar?month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}`}>
            &larr; Prev
          </Link>
          <Link href={`/calendar?month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}`}>
            Next &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className="min-h-[88px] rounded-md border border-neutral-200 p-1.5 text-left align-top"
          >
            {day && (
              <>
                <div className="text-xs text-neutral-500">{day}</div>
                <div className="space-y-0.5">
                  {(byDay.get(day) ?? []).map((item) => (
                    <div key={item.id} className="flex items-center gap-1 truncate text-xs">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`} />
                      <span className="truncate">
                        {item.title}
                        {item.amount != null ? ` ${formatDollars(item.amount)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {monthTotal > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3">
          <span className="text-sm font-medium">Total for {monthLabel}</span>
          <span className="text-sm font-semibold text-red-600">{formatDollars(monthTotal)}</span>
        </div>
      )}
    </main>
  );
}
