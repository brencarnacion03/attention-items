"use client";

import { useEffect, useState } from "react";
import type { Urgency } from "@/lib/types";
import { AddEventModal } from "./AddEventModal";

export interface CalendarEntry {
  id: string;
  title: string;
  urgency: Urgency;
  amount: number | null;
}

// Matches the dashboard's muted urgency language (see URGENCY_COLOR in
// dashboard/page.tsx) instead of stock rainbow red/yellow/green/blue, so the
// two tabs read as the same app.
const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-[#d99a3c]",
  green: "bg-hunter-400",
  blue: "bg-sand-500",
};

const TRANSITION_MS = 220;

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Bottom sheet showing what's already on a day - opens instead of the add-item
 * form when the day isn't empty, so tapping a busy day zooms in on it first. */
function DayInfoSheet({
  dateLabel,
  entries,
  onAddNew,
  onClose,
}: {
  dateLabel: string;
  entries: CalendarEntry[];
  onAddNew: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[220ms] ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-ink-700 bg-ink-950 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-[220ms] ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-ink-600" />

        <div className="flex items-start justify-between px-5 pb-1 pt-4">
          <h2 className="text-sm font-semibold text-sand-100">{dateLabel}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-m-1.5 rounded-full p-1.5 text-sand-500 transition-transform active:scale-90 hover:text-sand-100"
          >
            &times;
          </button>
        </div>

        <ul className="space-y-2 px-5 pt-2">
          {entries.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink-700 px-3.5 py-2.5 shadow-sm">
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`} />
                <span className="min-w-0 break-words text-sm font-medium text-sand-100">{item.title}</span>
              </div>
              {item.amount != null && (
                <div className="pl-3.5 text-xs text-sand-400">{formatDollars(item.amount)}</div>
              )}
            </li>
          ))}
        </ul>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={onAddNew}
            className="w-full rounded-xl bg-hunter-600 py-3 text-base font-semibold text-sand-50 transition-transform active:scale-[0.98]"
          >
            + Add another item
          </button>
        </div>
      </div>
    </div>
  );
}

export function CalendarGrid({
  year,
  monthIndex,
  cells,
  entriesByDay,
}: {
  year: number;
  monthIndex: number;
  cells: (number | null)[];
  entriesByDay: Record<number, CalendarEntry[]>;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewDay, setViewDay] = useState<number | null>(null);

  const dateISOFor = (day: number) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedDateISO = selectedDay != null ? dateISOFor(selectedDay) : null;
  const viewDateLabel =
    viewDay != null
      ? new Date(dateISOFor(viewDay) + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-sand-500 sm:gap-1 sm:text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="truncate">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {cells.map((day, i) => (
          <button
            key={i}
            type="button"
            disabled={!day}
            onClick={() => {
              if (!day) return;
              if ((entriesByDay[day] ?? []).length > 0) {
                setViewDay(day);
              } else {
                setSelectedDay(day);
              }
            }}
            className={`min-h-[64px] min-w-0 overflow-hidden rounded-xl border border-ink-700 p-1 text-left align-top transition-transform sm:min-h-[100px] sm:p-1.5 ${
              day ? "cursor-pointer hover:border-ink-600 hover:bg-sand-100/5 active:scale-95" : "cursor-default"
            }`}
          >
            {day && (
              <>
                <div className="text-[10px] text-sand-500 sm:text-xs">{day}</div>
                <div className="space-y-1 sm:space-y-1.5">
                  {(entriesByDay[day] ?? []).map((item) => (
                    <div key={item.id} className="min-w-0 text-[10px] sm:text-xs">
                      <div className="flex min-w-0 items-start gap-1">
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`}
                        />
                        <span className="line-clamp-2 min-w-0 break-words text-left font-semibold text-sand-100">
                          {item.title}
                        </span>
                      </div>
                      {item.amount != null && (
                        <div className="truncate pl-2.5 text-left text-sand-500">
                          {formatDollars(item.amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </button>
        ))}
      </div>

      {viewDay != null && viewDateLabel && (
        <DayInfoSheet
          dateLabel={viewDateLabel}
          entries={entriesByDay[viewDay] ?? []}
          onAddNew={() => {
            const day = viewDay;
            setViewDay(null);
            setSelectedDay(day);
          }}
          onClose={() => setViewDay(null)}
        />
      )}

      {selectedDateISO && (
        <AddEventModal dateISO={selectedDateISO} onClose={() => setSelectedDay(null)} />
      )}
    </>
  );
}
