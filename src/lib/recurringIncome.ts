import type { IncomeFrequency } from "./types";

const FREQUENCY_DAYS: Record<IncomeFrequency, number> = {
  weekly: 7,
  biweekly: 14,
};

function parseISODate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/** Every occurrence of a weekly/biweekly paycheck that falls within [rangeStart, rangeEnd]. */
export function incomeOccurrencesInRange(
  startDateISO: string,
  frequency: IncomeFrequency,
  rangeStartISO: string,
  rangeEndISO: string
): string[] {
  const step = FREQUENCY_DAYS[frequency];
  const start = parseISODate(startDateISO);
  const rangeStart = parseISODate(rangeStartISO);
  const rangeEnd = parseISODate(rangeEndISO);
  if (start > rangeEnd) return [];

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.round((rangeStart.getTime() - start.getTime()) / msPerDay);
  const stepsToSkip = daysSinceStart > 0 ? Math.floor(daysSinceStart / step) : 0;

  const occurrences: string[] = [];
  let cursor = new Date(start.getTime() + stepsToSkip * step * msPerDay);
  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) occurrences.push(toISODate(cursor));
    cursor = new Date(cursor.getTime() + step * msPerDay);
  }
  return occurrences;
}
