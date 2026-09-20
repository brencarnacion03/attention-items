"use client";

import { useState } from "react";
import type { Urgency } from "@/lib/types";
import { AddEventModal } from "./AddEventModal";

export interface CalendarEntry {
  id: string;
  title: string;
  urgency: Urgency;
  amount: number | null;
}

const URGENCY_DOT: Record<Urgency, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
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

  const selectedDateISO =
    selectedDay != null
      ? `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
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
            onClick={() => day && setSelectedDay(day)}
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

      {selectedDateISO && (
        <AddEventModal dateISO={selectedDateISO} onClose={() => setSelectedDay(null)} />
      )}
    </>
  );
}
