"use client";

import { useRef, useState, useTransition } from "react";
import { addOneTimeItem, addRecurringBill } from "./actions";
import type { ItemType } from "@/lib/types";

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "bill", label: "Bill" },
  { value: "renewal", label: "Renewal" },
  { value: "appointment", label: "Appointment" },
  { value: "deadline", label: "Deadline" },
  { value: "reservation", label: "Reservation" },
];

const NEEDS_TIME_AND_ADDRESS: ItemType[] = ["appointment", "reservation"];

export function AddItemForm() {
  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
  const [type, setType] = useState<ItemType>("bill");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const showTimeAndAddress = NEEDS_TIME_AND_ADDRESS.includes(type);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "one-time") {
          await addOneTimeItem(formData);
        } else {
          await addRecurringBill(formData);
        }
        formRef.current?.reset();
        setType("bill");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add item.");
      }
    });
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="card-surface mb-6 space-y-3 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-sand-100">Add an item</span>
        <div className="flex flex-1 rounded-xl bg-ink-800 p-1 text-sm">
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
            Recurring monthly
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          required
          placeholder={mode === "recurring" ? "e.g. Rent" : "e.g. Pay furniture installment"}
          className="min-w-[180px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
        />
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
          className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {mode === "one-time" ? (
          <input
            type="date"
            name="due_date"
            className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
          />
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-sm text-sand-200">
              Day of month
              <input
                type="number"
                name="day_of_month"
                min={1}
                max={31}
                defaultValue={1}
                required
                className="w-16 rounded-xl border border-sand-300 bg-sand-100 px-2 py-1.5 text-base text-ink-950"
              />
            </label>
            <span className="basis-full text-xs text-sand-400">
              Months without that day use the last day of the month instead.
            </span>
            <label className="flex items-center gap-1.5 text-sm text-sand-200">
              <input type="checkbox" name="email_reminder" defaultChecked />
              Email reminder
            </label>
          </>
        )}

        <label className="flex items-center gap-1.5 text-sm text-sand-200">
          $
          <input
            type="number"
            name="amount"
            min={0}
            step="0.01"
            placeholder="optional"
            className="w-24 rounded-xl border border-sand-300 bg-sand-100 px-2 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
          />
        </label>

        {showTimeAndAddress && (
          <>
            <input
              type="time"
              name="event_time"
              className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
            />
            <input
              name="address"
              placeholder="Address (optional)"
              className="min-w-[180px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
            />
          </>
        )}

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
