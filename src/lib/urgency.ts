import type { Urgency } from "./types";

/** Deterministic urgency for manually-entered items, based on days until due. */
export function urgencyForDueDate(dueDateISO: string | null): Urgency {
  if (!dueDateISO) return "blue";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateISO + "T00:00:00");
  const daysUntil = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 3) return "red";
  if (daysUntil <= 14) return "yellow";
  return "green";
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** `dayOfMonth` clamped to the given month's last day, for months shorter
 * than `dayOfMonth` (e.g. day 31 lands on Feb 28/29). */
export function clampDayToMonth(year: number, monthIndex: number, dayOfMonth: number): number {
  return Math.min(dayOfMonth, daysInMonth(year, monthIndex));
}

function dateForDayInMonth(year: number, monthIndex: number, dayOfMonth: number): Date {
  return new Date(year, monthIndex, clampDayToMonth(year, monthIndex, dayOfMonth));
}

/** The next occurrence of `dayOfMonth`, today included. */
export function nextOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  const candidate = dateForDayInMonth(today.getFullYear(), today.getMonth(), dayOfMonth);
  candidate.setHours(0, 0, 0, 0);

  if (candidate.getTime() < today.getTime()) {
    return dateForDayInMonth(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  }
  return candidate;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Deterministic dedupe key for a recurring bill's occurrence in a given month. */
export function occurrenceSourceId(billId: string, occurrence: Date): string {
  const yearMonth = `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, "0")}`;
  return `recurring-${billId}-${yearMonth}`;
}
