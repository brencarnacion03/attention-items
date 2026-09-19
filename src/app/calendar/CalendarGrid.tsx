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
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <button
            key={i}
            type="button"
            disabled={!day}
            onClick={() => day && setSelectedDay(day)}
            className={`min-h-[100px] rounded-md border border-neutral-200 p-1.5 text-left align-top transition-colors ${
              day ? "cursor-pointer hover:border-neutral-400 hover:bg-white/5" : "cursor-default"
            }`}
          >
            {day && (
              <>
                <div className="text-xs text-neutral-500">{day}</div>
                <div className="space-y-1.5">
                  {(entriesByDay[day] ?? []).map((item) => (
                    <div key={item.id} className="text-xs">
                      <div className="flex items-start gap-1">
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`}
                        />
                        <span className="break-words text-left font-semibold">{item.title}</span>
                      </div>
                      {item.amount != null && (
                        <div className="pl-2.5 text-left text-neutral-500">
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
