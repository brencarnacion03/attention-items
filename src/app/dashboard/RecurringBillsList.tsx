"use client";

import { useRef, useState, useTransition } from "react";
import { deleteRecurringBill } from "./actions";
import type { RecurringBill } from "@/lib/types";

const DELETE_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = DELETE_WIDTH * 0.55;
const EXIT_MS = 180;

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-sand-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
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

function CountBadge({ count }: { count: number }) {
  return (
    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-sand-100/15 px-1.5 text-[11px] font-semibold text-sand-100">
      {count}
    </span>
  );
}

/** A bill row you can swipe left on (mouse or touch) to reveal a Delete action,
 * matching iOS's swipe-to-delete list interaction. */
function SwipeToDeleteRow({
  bill,
  isPending,
  onRemove,
}: {
  bill: RecurringBill;
  isPending: boolean;
  onRemove: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const startDragX = useRef(0);
  const moved = useRef(false);

  const clamp = (x: number) => Math.min(0, Math.max(-DELETE_WIDTH - 16, x));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPending || removing) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startDragX.current = dragX;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    setDragX(clamp(startDragX.current + delta));
  };

  const endDrag = () => {
    if (pointerId.current === null) return;
    pointerId.current = null;
    setDragging(false);
    setDragX((x) => (x < -SWIPE_OPEN_THRESHOLD ? -DELETE_WIDTH : 0));
  };

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(onRemove, EXIT_MS);
  };

  return (
    <li
      className={`relative overflow-hidden rounded-2xl transition-[opacity,transform] duration-150 ${
        removing ? "scale-95 opacity-0" : "scale-100 opacity-100"
      }`}
    >
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: DELETE_WIDTH }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex flex-1 items-center justify-center rounded-2xl bg-red-600 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ transform: `translateX(${dragX}px)`, touchAction: "pan-y" }}
        className={`card-surface relative select-none px-3.5 py-2.5 text-sm ${
          dragging ? "" : "transition-transform duration-200 ease-out"
        }`}
      >
        <p className="text-sand-100">
          {bill.title}
          {bill.amount != null ? ` · $${bill.amount.toFixed(2)}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-sand-500">
          day {bill.day_of_month} of each month
          {bill.email_reminder ? ` · emails ${bill.reminder_days_before}d before` : ""}
        </p>
      </div>
    </li>
  );
}

export function RecurringBillsList({ bills }: { bills: RecurringBill[] }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  if (bills.length === 0) return null;

  const remove = (id: string) => startTransition(() => deleteRecurringBill(id));

  if (bills.length === 1) {
    return (
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sand-500">
          Recurring bills
        </h2>
        <ul className="space-y-1.5">
          <SwipeToDeleteRow bill={bills[0]} isPending={isPending} onRemove={() => remove(bills[0].id)} />
        </ul>
      </div>
    );
  }

  const [first, ...rest] = bills;
  const totalAmount = bills.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sand-500">
        Recurring bills
      </h2>

      {/* Collapsed: a stack of peeking cards, like a grouped iOS notification. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative pb-2">
            <div
              aria-hidden="true"
              className="card-surface absolute inset-x-3 top-2 h-full"
            />
            <div
              aria-hidden="true"
              className="card-surface absolute inset-x-1.5 top-1 h-full"
            />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="card-surface relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform duration-150 active:scale-[0.97] active:brightness-95"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-sand-100">{first.title}</p>
                  <CountBadge count={bills.length} />
                </div>
                <p className="mt-0.5 truncate text-xs text-sand-400">
                  {first.amount != null ? `${formatDollars(first.amount)} · ` : ""}day{" "}
                  {first.day_of_month} of each month
                </p>
                <p className="mt-1.5 text-xs text-sand-500">
                  {rest.length} more bill{rest.length === 1 ? "" : "s"} ·{" "}
                  {formatDollars(totalAmount)} total
                </p>
              </div>
              <ChevronIcon expanded={false} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: the full, scrollable list - swipe a row left to delete it. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mb-1.5 flex w-full items-center gap-2 rounded-xl px-1 py-1 text-xs font-medium text-sand-500 transition-transform active:scale-[0.98]"
          >
            <ChevronIcon expanded={true} />
            <span>Recurring bills</span>
            <span className="text-sand-500/70">· swipe a bill to delete it</span>
          </button>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
            {bills.map((bill) => (
              <SwipeToDeleteRow key={bill.id} bill={bill} isPending={isPending} onRemove={() => remove(bill.id)} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
