// The Chronicle's measure of time. Space on the page follows the square root of the years between
// entries: long silences stay long without making the reader scroll for a fortnight.
import type { ChronicleEntry } from "../../content/chronicle";

const SECOND_AGE_YEARS = 3441;

/** Years since the First Year of the Second Age. Years in the Third Age continue the count. */
export function absoluteYear(year: string): number {
  const match = /(S\.A\.|T\.A\.)\s*(\d+)/.exec(year);
  if (!match) throw new Error(`chronicle: unreadable year "${year}"`);
  const value = Number(match[2]);
  return match[1] === "T.A." ? SECOND_AGE_YEARS + value : value;
}

export function formatYear(absolute: number): string {
  const year = Math.round(absolute);
  return year > SECOND_AGE_YEARS ? `T.A. ${year - SECOND_AGE_YEARS}` : `S.A. ${year}`;
}

export function gapRem(years: number): number {
  return 3 + Math.sqrt(Math.max(0, years)) * 0.46;
}

/** The year under the reader, given which entry they have passed and how far towards the next. */
export function yearAt(entries: ChronicleEntry[], index: number, fraction: number): number {
  const here = absoluteYear(entries[index]!.year);
  const next = entries[index + 1];
  return next ? here + (absoluteYear(next.year) - here) * fraction : here;
}

/**
 * Heat rises through the whole descent and is gone by the final entry. Scroll position `depth`
 * runs 0-1 up to the last dated entry, then `out` runs 0-1 across the refusal.
 */
export function heatAt(depth: number, out: number): number {
  const rise = Math.min(1, Math.max(0, depth));
  return rise ** 1.5 * (1 - Math.min(1, Math.max(0, out)));
}
