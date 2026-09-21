"use client";

import { useRef, useState, useTransition } from "react";
import { addGoal } from "./actions";

export function AddGoalForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await addGoal(formData);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add goal.");
      }
    });
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="card-surface mb-6 space-y-3 p-4"
    >
      <span className="text-sm font-medium text-sand-100">Add a savings goal</span>
      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          required
          placeholder="e.g. Emergency fund"
          className="min-w-[180px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
        />
        <label className="flex items-center gap-1.5 text-sm text-sand-200">
          $
          <input
            type="number"
            name="target_amount"
            min={0}
            step="0.01"
            required
            placeholder="Target"
            className="w-28 rounded-xl border border-sand-300 bg-sand-100 px-2 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
          />
        </label>
        <input
          type="date"
          name="target_date"
          className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-hunter-600 px-4 py-1.5 text-sm font-medium text-sand-50 transition-transform active:scale-90 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
