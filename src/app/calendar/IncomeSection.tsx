"use client";

import { useRef, useState, useTransition } from "react";
import { addIncomeEntry, deleteIncomeEntry } from "./actions";
import type { IncomeEntry } from "@/lib/types";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function IncomeSection({
  entries,
  defaultDate,
  monthLabel,
}: {
  entries: IncomeEntry[];
  defaultDate: string;
  monthLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await addIncomeEntry(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add income.");
      }
    });
  };

  return (
    <div className="mt-3 rounded-md border border-neutral-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Income for {monthLabel}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-green-500">{formatDollars(total)}</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-neutral-500 underline"
          >
            {open ? "Close" : "+ Add income"}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-xs text-neutral-400">
              <span className="min-w-0 truncate">
                {entry.title || "Income"} &middot; {entry.received_date}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-medium text-neutral-200">{formatDollars(entry.amount)}</span>
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteIncomeEntry(entry.id))}
                  disabled={isPending}
                  className="text-neutral-600 underline hover:text-neutral-400 disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form ref={formRef} action={handleSubmit} className="mt-3 flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
          <input
            name="title"
            placeholder="e.g. Paycheck (optional)"
            className="min-w-[160px] flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black placeholder:text-neutral-400"
          />
          <input
            type="number"
            name="amount"
            min={0}
            step="0.01"
            required
            placeholder="$"
            className="w-24 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black placeholder:text-neutral-400"
          />
          <input
            type="date"
            name="received_date"
            defaultValue={defaultDate}
            required
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add"}
          </button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
}
