"use client";

import { useState, useTransition } from "react";
import { deleteRecurringBill } from "./actions";
import type { RecurringBill } from "@/lib/types";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BillRow({
  bill,
  isPending,
  onRemove,
}: {
  bill: RecurringBill;
  isPending: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded-2xl border border-neutral-200 px-3.5 py-2 text-sm shadow-sm">
      <span>
        {bill.title}
        {bill.amount != null ? ` · $${bill.amount.toFixed(2)}` : ""} · day {bill.day_of_month} of
        each month
        {bill.email_reminder ? ` · emails ${bill.reminder_days_before}d before` : ""}
      </span>
      <button
        disabled={isPending}
        onClick={onRemove}
        className="rounded-full px-2 py-1 text-xs text-neutral-500 underline transition-transform active:scale-90 disabled:opacity-50"
      >
        Remove
      </button>
    </li>
  );
}

export function RecurringBillsList({ bills }: { bills: RecurringBill[] }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  if (bills.length === 0) return null;

  const remove = (id: string) => startTransition(() => deleteRecurringBill(id));

  if (bills.length === 1) {
    return (
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Recurring bills
        </h2>
        <ul className="space-y-1.5">
          <BillRow bill={bills[0]} isPending={isPending} onRemove={() => remove(bills[0].id)} />
        </ul>
      </div>
    );
  }

  const [first, ...rest] = bills;
  const totalAmount = bills.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">
        Recurring bills
      </h2>

      {/* Collapsed: a stack of peeking cards, like a grouped iOS notification. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative pb-2">
            <div
              aria-hidden="true"
              className="absolute inset-x-3 top-2 h-full rounded-2xl border border-neutral-800 bg-neutral-900/50"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-1.5 top-1 h-full rounded-2xl border border-neutral-800 bg-neutral-900/70"
            />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="relative flex w-full items-start justify-between gap-3 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-white">{first.title}</p>
                  <span className="shrink-0 text-xs text-neutral-500">{bills.length}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-400">
                  {first.amount != null ? `${formatDollars(first.amount)} · ` : ""}day{" "}
                  {first.day_of_month} of each month
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {rest.length} more bill{rest.length === 1 ? "" : "s"} ·{" "}
                  {formatDollars(totalAmount)} total
                </p>
              </div>
              <ChevronIcon expanded={false} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: the full list, one row per bill. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mb-1.5 flex w-full items-center justify-between rounded-xl px-1 py-1 text-xs font-medium text-neutral-500 transition-transform active:scale-[0.98]"
          >
            <span>Recurring bills</span>
            <ChevronIcon expanded={true} />
          </button>
          <ul className="space-y-1.5">
            {bills.map((bill) => (
              <BillRow key={bill.id} bill={bill} isPending={isPending} onRemove={() => remove(bill.id)} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
