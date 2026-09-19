"use client";

import { useTransition } from "react";
import { deleteRecurringBill } from "./actions";
import type { RecurringBill } from "@/lib/types";

export function RecurringBillsList({ bills }: { bills: RecurringBill[] }) {
  const [isPending, startTransition] = useTransition();

  if (bills.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">
        Recurring bills
      </h2>
      <ul className="space-y-1.5">
        {bills.map((bill) => (
          <li
            key={bill.id}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 px-3.5 py-2 text-sm shadow-sm transition-opacity"
          >
            <span>
              {bill.title}
              {bill.amount != null ? ` · $${bill.amount.toFixed(2)}` : ""} · day{" "}
              {bill.day_of_month} of each month
              {bill.email_reminder ? ` · emails ${bill.reminder_days_before}d before` : ""}
            </span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteRecurringBill(bill.id))}
              className="rounded-full px-2 py-1 text-xs text-neutral-500 underline transition-transform active:scale-90 disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
