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
      className="mb-6 space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Add an item</span>
        <div className="flex flex-1 rounded-xl bg-neutral-900 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("one-time")}
            className={`flex-1 rounded-lg py-1.5 font-medium transition-all ${
              mode === "one-time" ? "bg-white text-black" : "text-neutral-400"
            }`}
          >
            One-time
          </button>
          <button
            type="button"
            onClick={() => setMode("recurring")}
            className={`flex-1 rounded-lg py-1.5 font-medium transition-all ${
              mode === "recurring" ? "bg-white text-black" : "text-neutral-400"
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
          className="min-w-[180px] flex-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black placeholder:text-neutral-400"
        />
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
          className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black"
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
            className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black"
          />
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-sm">
              Day of month
              <input
                type="number"
                name="day_of_month"
                min={1}
                max={28}
                defaultValue={1}
                required
                className="w-16 rounded-xl border border-neutral-300 bg-white px-2 py-1.5 text-base text-black"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="email_reminder" defaultChecked />
              Email reminder
            </label>
          </>
        )}

        <label className="flex items-center gap-1.5 text-sm">
          $
          <input
            type="number"
            name="amount"
            min={0}
            step="0.01"
            placeholder="optional"
            className="w-24 rounded-xl border border-neutral-300 bg-white px-2 py-1.5 text-base text-black placeholder:text-neutral-400"
          />
        </label>

        {showTimeAndAddress && (
          <>
            <input
              type="time"
              name="event_time"
              className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black"
            />
            <input
              name="address"
              placeholder="Address (optional)"
              className="min-w-[180px] flex-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-black placeholder:text-neutral-400"
            />
          </>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-black px-4 py-1.5 text-sm font-medium text-white transition-transform active:scale-90 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
