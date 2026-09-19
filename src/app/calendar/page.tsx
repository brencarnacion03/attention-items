import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, Urgency } from "@/lib/types";

const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

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

  const byDay = new Map<number, AttentionItem[]>();
  for (const item of (items ?? []) as AttentionItem[]) {
    if (!item.due_date) continue;
    const day = Number(item.due_date.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

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
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
