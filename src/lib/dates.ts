/**
 * Calendar dates as the admin and the site show them. Pure, so the screens
 * that used to carry their own copy of each of these share one.
 */

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Local-time YYYY-MM-DD. toISOString() would shift the day in IST. */
export function toDateInput(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A bare date is read as local midnight — as UTC midnight it would be the day before west of Greenwich. */
function parse(value: string): Date {
  return new Date(ISO_DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
}

/**
 * "5 Nov 2026", for a date column or a timestamp. Blank prints `empty`; a
 * value that will not parse prints as stored rather than "Invalid Date".
 */
export function formatShortDate(value: string | null | undefined, empty = "—"): string {
  if (!value) return empty;
  const parsed = parse(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "5 November 2026", the day as it is in India — the guides' review date. */
export function formatIstLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Whole days from today to an ISO date; negative once it is past. */
export function daysUntil(value: string | null, today: Date = new Date()): number | null {
  if (!value) return null;
  const target = parse(value);
  if (Number.isNaN(target.valueOf())) return null;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Math.round((target.valueOf() - start.valueOf()) / 86400000);
}
