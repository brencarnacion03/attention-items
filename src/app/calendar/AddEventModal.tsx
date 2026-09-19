"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOneTimeItem, addRecurringBill } from "@/app/dashboard/actions";
import type { ItemType } from "@/lib/types";

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "bill", label: "Bill" },
  { value: "renewal", label: "Renewal" },
  { value: "appointment", label: "Appointment" },
  { value: "deadline", label: "Deadline" },
  { value: "reservation", label: "Reservation" },
];

const NEEDS_TIME_AND_ADDRESS: ItemType[] = ["appointment", "reservation"];

export function AddEventModal({ dateISO, onClose }: { dateISO: string; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
  const [type, setType] = useState<ItemType>("bill");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const showTimeAndAddress = NEEDS_TIME_AND_ADDRESS.includes(type);

  const dayOfMonth = Number(dateISO.slice(8, 10));
  const dateLabel = new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "one-time") {
          formData.set("due_date", dateISO);
          await addOneTimeItem(formData);
        } else {
          formData.set("day_of_month", String(dayOfMonth));
          await addRecurringBill(formData);
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add item.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-sm font-semibold">{dateLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-white"
          >
            &times;
          </button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="mode"
                checked={mode === "one-time"}
                onChange={() => setMode("one-time")}
              />
              One-time
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="mode"
                checked={mode === "recurring"}
                onChange={() => setMode("recurring")}
              />
              Recurring monthly
            </label>
          </div>

          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Pay furniture installment"
            className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-black placeholder:text-neutral-400"
          />

          <div className="flex gap-2">
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-black"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              $
              <input
                type="number"
                name="amount"
                min={0}
                step="0.01"
                placeholder="optional"
                className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-black placeholder:text-neutral-400"
              />
            </label>
          </div>

          {showTimeAndAddress && (
            <div className="flex gap-2">
              <input
                type="time"
                name="event_time"
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-black"
              />
              <input
                name="address"
                placeholder="Address (optional)"
                className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-black placeholder:text-neutral-400"
              />
            </div>
          )}

          {mode === "recurring" && (
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="email_reminder" defaultChecked />
              Email reminder a few days before
            </label>
          )}

          <p className="text-xs text-neutral-500">
            {mode === "recurring" ? `Repeats on day ${dayOfMonth} of every month.` : `Due ${dateLabel}.`}
          </p>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
