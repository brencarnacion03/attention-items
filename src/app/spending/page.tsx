import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AttentionItem, ItemType, RecurringIncome } from "@/lib/types";
import { incomeOccurrencesInRange } from "@/lib/recurringIncome";
import { SpendingChart, type SpendingCategory } from "./SpendingChart";
import { TabBar } from "@/components/TabBar";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Granularity = "daily" | "weekly" | "monthly" | "yearly";

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAnchor(dateParam: string | undefined): Date {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function periodRange(granularity: Granularity, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (granularity === "weekly") {
    start.setDate(start.getDate() - start.getDay());
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else if (granularity === "monthly") {
    start.setDate(1);
    end.setFullYear(start.getFullYear());
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
  } else if (granularity === "yearly") {
    start.setMonth(0, 1);
    end.setFullYear(start.getFullYear(), 11, 31);
  }
  // daily: start === end already

  return { start, end };
}

function shiftAnchor(granularity: Granularity, anchor: Date, dir: 1 | -1): Date {
  const next = new Date(anchor);
  if (granularity === "daily") next.setDate(next.getDate() + dir);
  else if (granularity === "weekly") next.setDate(next.getDate() + dir * 7);
  else if (granularity === "monthly") next.setMonth(next.getMonth() + dir);
  else next.setFullYear(next.getFullYear() + dir);
  return next;
}

function periodLabel(granularity: Granularity, start: Date, end: Date): string {
  if (granularity === "daily") {
    return start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (granularity === "weekly") {
    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${startLabel} – ${endLabel}`;
  }
  if (granularity === "monthly") {
    return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return String(start.getFullYear());
}

function spendingHref(granularity: Granularity, date: Date): string {
  return `/spending?granularity=${granularity}&date=${toISODate(date)}`;
}

const CATEGORY_ORDER: ItemType[] = [
  "bill",
  "renewal",
  "appointment",
  "deadline",
  "reservation",
  "document",
];
const CATEGORY_LABEL: Record<ItemType, string> = {
  bill: "Bill",
  renewal: "Renewal",
  appointment: "Appointment",
  deadline: "Deadline",
  reservation: "Reservation",
  document: "Document",
};
// Categorical palette (dark-mode steps), fixed order, validated for CVD/contrast
// against this app's dark surface - see dataviz skill's palette.md.
const CATEGORY_COLOR: Record<ItemType, string> = {
  bill: "#3987e5",
  renewal: "#d95926",
  appointment: "#199e70",
  deadline: "#c98500",
  reservation: "#d55181",
  document: "#008300",
};

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: { granularity?: string; date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const granularity: Granularity = GRANULARITIES.some((g) => g.value === searchParams.granularity)
    ? (searchParams.granularity as Granularity)
    : "monthly";
  const anchor = parseAnchor(searchParams.date);
  const { start, end } = periodRange(granularity, anchor);

  const { data: items } = await supabase
    .from("attention_items")
    .select("*")
    .gte("due_date", toISODate(start))
    .lte("due_date", toISODate(end))
    .not("amount", "is", null)
    .order("due_date", { ascending: true });

  const byType = new Map<ItemType, AttentionItem[]>();
  for (const item of (items ?? []) as AttentionItem[]) {
    byType.set(item.type, [...(byType.get(item.type) ?? []), item]);
  }

  const totalAmount = (items ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const rangeStartISO = toISODate(start);
  const rangeEndISO = toISODate(end);

  const { data: incomeEntries } = await supabase
    .from("income_entries")
    .select("*")
    .gte("received_date", rangeStartISO)
    .lte("received_date", rangeEndISO);

  const { data: recurringIncome } = await supabase.from("recurring_income").select("*");

  let totalIncome = (incomeEntries ?? []).reduce((sum, entry) => sum + entry.amount, 0);
  for (const rule of (recurringIncome ?? []) as RecurringIncome[]) {
    const occurrences = incomeOccurrencesInRange(rule.start_date, rule.frequency, rangeStartISO, rangeEndISO);
    totalIncome += occurrences.length * rule.amount;
  }

  const categories: SpendingCategory[] = CATEGORY_ORDER.filter((type) => (byType.get(type) ?? []).length > 0).map(
    (type) => {
      const typeItems = byType.get(type) ?? [];
      return {
        type,
        label: CATEGORY_LABEL[type],
        color: CATEGORY_COLOR[type],
        total: typeItems.reduce((sum, item) => sum + (item.amount ?? 0), 0),
        items: typeItems.map((item) => ({
          id: item.id,
          title: item.title,
          amount: item.amount ?? 0,
          due_date: item.due_date,
        })),
      };
    }
  );

  const prevAnchor = shiftAnchor(granularity, anchor, -1);
  const nextAnchor = shiftAnchor(granularity, anchor, 1);

  return (
    <main className="mx-auto max-w-3xl p-4 pb-28 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {GRANULARITIES.map((g) => (
          <Link
            key={g.value}
            href={spendingHref(g.value, g.value === granularity ? anchor : new Date())}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-transform active:scale-90 ${
              g.value === granularity
                ? "border-sand-200 bg-sand-200 text-ink-950"
                : "border-ink-600 text-sand-300 hover:border-sand-400/50"
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-center gap-4">
        <Link
          href={spendingHref(granularity, prevAnchor)}
          className="shrink-0 rounded-full px-2 py-1 text-sm text-sand-300 transition-transform active:scale-90"
        >
          &larr; Prev
        </Link>
        <h1 className="text-base font-semibold text-sand-100 sm:text-lg">{periodLabel(granularity, start, end)}</h1>
        <Link
          href={spendingHref(granularity, nextAnchor)}
          className="shrink-0 rounded-full px-2 py-1 text-sm text-sand-300 transition-transform active:scale-90"
        >
          Next &rarr;
        </Link>
      </div>

      <SpendingChart categories={categories} totalAmount={totalAmount} periodLabel={periodLabel(granularity, start, end)} />

      {(totalIncome > 0 || totalAmount > 0) && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between rounded-2xl border border-ink-700 px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-sand-100">
              Income for {periodLabel(granularity, start, end)}
            </span>
            <span className="text-sm font-semibold text-hunter-400">{formatDollars(totalIncome)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-ink-700 px-4 py-3 shadow-sm">
            <span className="text-sm font-medium text-sand-100">
              Net for {periodLabel(granularity, start, end)}
            </span>
            <span
              className={`text-sm font-semibold ${
                totalIncome - totalAmount >= 0 ? "text-hunter-400" : "text-red-500"
              }`}
            >
              {formatDollars(totalIncome - totalAmount)}
            </span>
          </div>
        </div>
      )}

      <TabBar active="spending" />
    </main>
  );
}
