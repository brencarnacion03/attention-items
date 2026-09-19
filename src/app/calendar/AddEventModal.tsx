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
const TRANSITION_MS = 220;

export function AddEventModal({ dateISO, onClose }: { dateISO: string; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");
  const [type, setType] = useState<ItemType>("bill");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const showTimeAndAddress = NEEDS_TIME_AND_ADDRESS.includes(type);

  const dayOfMonth = Number(dateISO.slice(8, 10));
  const dateLabel = new Date(dateISO + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, TRANSITION_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        close();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add item.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[220ms] ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-neutral-800 bg-neutral-950 shadow-2xl transition-transform duration-[220ms] ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-neutral-700" />

        <div className="flex items-start justify-between px-5 pb-1 pt-4">
          <h2 className="text-sm font-semibold">{dateLabel}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-m-1.5 rounded-full p-1.5 text-neutral-500 transition-transform active:scale-90 hover:text-white"
          >
            &times;
          </button>
        </div>

        <form action={handleSubmit} className="space-y-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex rounded-xl bg-neutral-900 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("one-time")}
              className={`flex-1 rounded-lg py-2 font-medium transition-all ${
                mode === "one-time" ? "bg-white text-black" : "text-neutral-400"
              }`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => setMode("recurring")}
              className={`flex-1 rounded-lg py-2 font-medium transition-all ${
                mode === "recurring" ? "bg-white text-black" : "text-neutral-400"
              }`}
            >
              Recurring monthly
            </button>
          </div>

          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Pay furniture installment"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-black placeholder:text-neutral-400"
          />

          <div className="flex gap-2">
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-black"
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
                className="w-24 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-black placeholder:text-neutral-400"
              />
            </label>
          </div>

          {showTimeAndAddress && (
            <div className="flex gap-2">
              <input
                type="time"
                name="event_time"
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-black"
              />
              <input
                name="address"
                placeholder="Address (optional)"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-black placeholder:text-neutral-400"
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

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-white py-3 text-base font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
}
