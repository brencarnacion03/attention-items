"use client";

import { useState, useTransition } from "react";
import { editItem, setItemStatus } from "./actions";
import { AddressLink } from "./AddressLink";
import type { AttentionItem, ItemType } from "@/lib/types";

const TYPE_LABEL: Record<AttentionItem["type"], string> = {
  bill: "Bill",
  renewal: "Renewal",
  appointment: "Appointment",
  deadline: "Deadline",
  reservation: "Reservation",
  document: "Document",
};

const TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "bill", label: "Bill" },
  { value: "renewal", label: "Renewal" },
  { value: "appointment", label: "Appointment" },
  { value: "deadline", label: "Deadline" },
  { value: "reservation", label: "Reservation" },
  { value: "document", label: "Document" },
];

const NEEDS_TIME_AND_ADDRESS: ItemType[] = ["appointment", "reservation"];

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0L4 15v5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ItemRow({ item }: { item: AttentionItem }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<ItemType>(item.type);
  const [error, setError] = useState<string | null>(null);
  const showTimeAndAddress = NEEDS_TIME_AND_ADDRESS.includes(type);

  const act = (status: "handled" | "dismissed") => {
    startTransition(() => setItemStatus(item.id, status));
  };

  const closeEdit = () => {
    setEditing(false);
    setType(item.type);
    setError(null);
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await editItem(item.id, formData);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes.");
      }
    });
  };

  return (
    <li
      className={`card-surface px-4 py-3 transition-all duration-200 ${
        isPending ? "scale-[0.98] opacity-40" : "scale-100 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sand-100">
            {item.title}
            {item.amount != null ? ` · $${item.amount.toFixed(2)}` : ""}
          </p>
          <div className="text-xs text-sand-400">
            {TYPE_LABEL[item.type]}
            {item.due_date ? ` · due ${item.due_date}` : ""}
            {item.event_time ? ` at ${formatTime12h(item.event_time)}` : ""}
            {item.address && (
              <>
                {" · "}
                <AddressLink address={item.address} />
              </>
            )}
            {" · "}
            {item.source}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? closeEdit() : setEditing(true))}
            aria-label={editing ? "Cancel editing" : "Edit"}
            className={`rounded-full border p-1.5 transition-transform active:scale-90 ${
              editing
                ? "border-sand-300 bg-sand-100/10 text-sand-100"
                : "border-ink-600 text-sand-300 hover:bg-ink-800"
            }`}
          >
            <PencilIcon />
          </button>
          {!editing && (
            <>
              <button
                onClick={() => act("handled")}
                disabled={isPending}
                className="rounded-full border border-ink-600 px-3 py-1.5 text-xs font-medium text-sand-200 transition-transform hover:bg-ink-800 active:scale-90 disabled:opacity-50"
              >
                Handled
              </button>
              <button
                onClick={() => act("dismissed")}
                disabled={isPending}
                className="rounded-full border border-ink-600 px-3 py-1.5 text-xs font-medium text-sand-200 transition-transform hover:bg-ink-800 active:scale-90 disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          editing ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <form action={handleSubmit} className="space-y-2 border-t border-ink-800 pt-3">
            <div className="flex flex-wrap gap-2">
              <input
                name="title"
                required
                defaultValue={item.title}
                className="min-w-[160px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
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
              <input
                type="date"
                name="due_date"
                defaultValue={item.due_date ?? ""}
                className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
              />
              <label className="flex items-center gap-1.5 text-sm text-sand-200">
                $
                <input
                  type="number"
                  name="amount"
                  min={0}
                  step="0.01"
                  defaultValue={item.amount ?? ""}
                  placeholder="optional"
                  className="w-24 rounded-xl border border-sand-300 bg-sand-100 px-2 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
                />
              </label>
              {showTimeAndAddress && (
                <>
                  <input
                    type="time"
                    name="event_time"
                    defaultValue={item.event_time ?? ""}
                    className="rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950"
                  />
                  <input
                    name="address"
                    defaultValue={item.address ?? ""}
                    placeholder="Address (optional)"
                    className="min-w-[160px] flex-1 rounded-xl border border-sand-300 bg-sand-100 px-2.5 py-1.5 text-base text-ink-950 placeholder:text-ink-600"
                  />
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-hunter-600 px-4 py-1.5 text-sm font-medium text-sand-50 transition-transform active:scale-90 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl px-4 py-1.5 text-sm font-medium text-sand-400 transition-transform active:scale-90"
              >
                Cancel
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        </div>
      </div>
    </li>
  );
}
