"use client";

import { useState, useTransition } from "react";
import { addMoneyToGoal, deleteContribution, deleteGoal } from "./actions";
import type { GoalContribution, SavingsGoal } from "@/lib/types";

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateISO + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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

export function GoalCard({ goal, contributions }: { goal: SavingsGoal; contributions: GoalContribution[] }) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const reached = goal.current_amount >= goal.target_amount;
  const remaining = daysUntil(goal.target_date ?? "");

  const submitAdd = () => {
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addMoneyToGoal(goal.id, value);
        setAmount("");
        setAdding(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add money.");
      }
    });
  };

  return (
    <li className="rounded-2xl border border-ink-700 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sand-100">{goal.title}</p>
          <p className="mt-0.5 text-xs text-sand-400">
            {formatDollars(goal.current_amount)} of {formatDollars(goal.target_amount)}
            {goal.target_date && (
              <> · {remaining >= 0 ? `${remaining}d left` : "past due"}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTransition(() => deleteGoal(goal.id))}
          disabled={isPending}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-sand-500/70 underline transition-transform active:scale-90 disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            reached ? "bg-hunter-400" : "bg-hunter-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-sand-500">
        {Math.round(pct)}%{reached ? " · reached!" : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {adding ? (
          <>
            <input
              type="number"
              min={0}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$ amount"
              className="w-28 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
            />
            <button
              type="button"
              onClick={submitAdd}
              disabled={isPending}
              className="rounded-xl bg-hunter-600 px-3 py-1.5 text-sm font-medium text-sand-50 transition-transform active:scale-90 disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
                setAmount("");
              }}
              className="rounded-xl px-2 py-1.5 text-sm text-sand-400 transition-transform active:scale-90"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-ink-600 px-3 py-1.5 text-xs font-medium text-sand-200 transition-transform active:scale-90"
          >
            + Add money
          </button>
        )}

        {contributions.length > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-sand-400 transition-transform active:scale-90"
          >
            History ({contributions.length})
            <ChevronIcon expanded={historyOpen} />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {contributions.length > 0 && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            historyOpen ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain border-t border-ink-800 pr-0.5 pt-2">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-sand-400">{formatDate(c.contributed_at)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-sand-200">{formatDollars(c.amount)}</span>
                    <button
                      type="button"
                      onClick={() => startTransition(() => deleteContribution(c.id))}
                      disabled={isPending}
                      className="rounded-full px-1.5 py-0.5 text-sand-500/70 underline transition-transform active:scale-90 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}
