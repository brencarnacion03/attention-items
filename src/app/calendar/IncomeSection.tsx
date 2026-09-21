"use client";

import { useRef, useState, useTransition } from "react";
import { addIncomeEntry, addRecurringIncome, deleteIncomeEntry, deleteRecurringIncome } from "./actions";
import type { IncomeDisplayEntry, IncomeFrequency } from "@/lib/types";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
];

export function IncomeSection({
  entries,
  defaultDate,
  monthLabel,
}: {
  entries: IncomeDisplayEntry[];
  defaultDate: string;
  monthLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
  const [frequency, setFrequency] = useState<IncomeFrequency>("biweekly");
  const formRef = useRef<HTMLFormElement>(null);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "one-time") {
          await addIncomeEntry(formData);
        } else {
          formData.set("frequency", frequency);
          await addRecurringIncome(formData);
        }
        formRef.current?.reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add income.");
      }
    });
  };

  const handleRemove = (entry: IncomeDisplayEntry) => {
    startTransition(() =>
      entry.recurring ? deleteRecurringIncome(entry.removeId) : deleteIncomeEntry(entry.removeId)
    );
  };

  return (
    <div className="card-surface mt-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-sand-100">Income for {monthLabel}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-hunter-400">{formatDollars(total)}</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full px-2 py-1 text-xs text-sand-400 underline transition-transform active:scale-90"
          >
            {open ? "Close" : "+ Add income"}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-xs text-sand-400">
              <span className="min-w-0 truncate">
                {entry.title || "Income"} &middot; {entry.date}
                {entry.recurring && <span className="text-sand-500/70"> &middot; recurring</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-medium text-sand-200">{formatDollars(entry.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(entry)}
                  disabled={isPending}
                  className="rounded-full px-1.5 py-0.5 text-sand-500/70 underline transition-transform hover:text-sand-400 active:scale-90 disabled:opacity-50"
                >
                  {entry.recurring ? "Stop series" : "Remove"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form ref={formRef} action={handleSubmit} className="mt-3 space-y-2 border-t border-ink-700 pt-3">
          <div className="flex rounded-xl bg-ink-800 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("one-time")}
              className={`flex-1 rounded-lg py-1.5 font-medium transition-all ${
                mode === "one-time" ? "bg-sand-200 text-ink-950" : "text-sand-500"
              }`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => setMode("recurring")}
              className={`flex-1 rounded-lg py-1.5 font-medium transition-all ${
                mode === "recurring" ? "bg-sand-200 text-ink-950" : "text-sand-500"
              }`}
            >
              Recurring paycheck
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              name="title"
              placeholder="e.g. Paycheck (optional)"
              className="min-w-[160px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
            />
            <input
              type="number"
              name="amount"
              min={0}
              step="0.01"
              required
              placeholder="$"
              className="w-24 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
            />

            {mode === "one-time" ? (
              <input
                type="date"
                name="received_date"
                defaultValue={defaultDate}
                required
                className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
              />
            ) : (
              <>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
                  className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-sand-400">
                  Starting
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={defaultDate}
                    required
                    className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-hunter-600 px-3 py-1.5 text-sm font-medium text-sand-50 transition-transform active:scale-90 disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add"}
            </button>
          </div>

          {mode === "recurring" && (
            <p className="text-xs text-sand-500">
              Adds a paycheck every {frequency === "weekly" ? "week" : "2 weeks"} - it&rsquo;ll show up on
              the calendar automatically, no need to re-enter it each time.
            </p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
}
