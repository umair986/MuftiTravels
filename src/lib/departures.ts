/**
 * Departure cities and package months — see docs/monthly-packages.md.
 *
 * Pure: no Supabase, no React, no import from the catalogue, so the month
 * arithmetic stays testable on its own (departures.test.ts). Umrah prices,
 * airlines and hotels move month to month, so an Umrah package is made for one
 * month and stops being shown once that month is over. Hajj and Ramadan
 * packages carry no month and never expire.
 *
 * A month is stored as the first day of the month, `YYYY-MM-01`, in a `date`
 * column. Everything here reads and writes that form.
 */

/**
 * Every city we sell from, in the order the site lists them. Mumbai first: it
 * is the home city and the one the business is built around.
 *
 * The key is what `packages.departure_city` stores and what the city page's URL
 * is built from (`/umrah-packages-from-<key>`), so a key is never renamed —
 * only its display name may change. Adding a city means adding it here AND a
 * route file under src/app; migration 026 only checks the key's format.
 */
export const DEPARTURE_CITIES = [
  { key: "mumbai", name: "Mumbai" },
  { key: "delhi", name: "Delhi" },
  { key: "lucknow", name: "Lucknow" },
  { key: "hyderabad", name: "Hyderabad" },
  { key: "bangalore", name: "Bangalore" },
  { key: "ahmedabad", name: "Ahmedabad" },
] as const;

export type CityKey = (typeof DEPARTURE_CITIES)[number]["key"];

export function isCityKey(value: unknown): value is CityKey {
  return DEPARTURE_CITIES.some((city) => city.key === value);
}

/** Display name for a stored key; empty for a package with no city. */
export function cityName(key: string | null | undefined): string {
  return DEPARTURE_CITIES.find((city) => city.key === key)?.name ?? "";
}

/** The city page's permanent address. */
export function cityPath(key: CityKey): string {
  return `/umrah-packages-from-${key}`;
}

/**
 * A key from what a visitor or an old link might send: "mumbai", "Mumbai",
 * "Bengaluru". Null for anything else, including "All India".
 */
export function cityKeyFromName(value: string | null | undefined): CityKey | null {
  const needle = (value ?? "").trim().toLowerCase();
  if (!needle) return null;
  if (needle === "bengaluru") return "bangalore";
  return (
    DEPARTURE_CITIES.find(
      (city) => city.key === needle || city.name.toLowerCase() === needle,
    )?.key ?? null
  );
}

/** Slug words that name each city — the same rule migration 026 backfills by. */
const SLUG_PATTERNS: Record<CityKey, RegExp> = {
  mumbai: /(^|-)mumbai(-|$)/,
  delhi: /(^|-)delhi(-|$)/,
  lucknow: /(^|-)lucknow(-|$)/,
  hyderabad: /(^|-)hyderabad(-|$)/,
  bangalore: /(^|-)(bangalore|bengaluru)(-|$)/,
  ahmedabad: /(^|-)ahmedabad(-|$)/,
};

/**
 * A package's city key, or "" for one that is not city-specific.
 *
 * A row read before migration 026 is applied has no `departure_city` key at
 * all (PostgREST omits a column that does not exist), and without the slug
 * fallback the three city pages that worked before 026 would show nothing in
 * the window between the deploy and the migration being run by hand. The slug
 * rule is the migration's own backfill rule, so the answer is the same before
 * and after.
 */
export function packageCity(item: {
  slug: string;
  departure_city?: string;
}): string {
  if (item.departure_city !== undefined) return item.departure_city;
  const match = DEPARTURE_CITIES.find(({ key }) =>
    SLUG_PATTERNS[key].test(item.slug),
  );
  return match?.key ?? "";
}

/**
 * The monthly product: the category that gets a city and a month by default.
 * Ramadan and Hajj packages are dated by their season, not by a month.
 */
export const MONTHLY_CATEGORY = "Umrah Fixed Group";

/* -------------------------------------------------------------------------- */
/* Months                                                                     */
/* -------------------------------------------------------------------------- */

/** IST is UTC+05:30 with no daylight saving, so a fixed offset is exact. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * This month in India, as `YYYY-MM-01`.
 *
 * In India, not wherever the code happens to run: Vercel and Supabase both run
 * on UTC, where 1 November begins at 05:30 IST — five and a half hours during
 * which October's packages would still be on the site in India. The database
 * does the same in `public.current_ist_month()`; the two are a pair.
 */
export function currentIstMonth(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return toMonthValue(ist.getUTCFullYear(), ist.getUTCMonth());
}

/**
 * True once the package's month is over. A package with no month never
 * expires — that is how Hajj and Ramadan packages opt out.
 *
 * Plain string comparison is correct here: `YYYY-MM-01` sorts as it reads.
 */
export function isMonthExpired(
  validMonth: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const month = normaliseMonth(validMonth);
  if (!month) return false;
  return month < currentIstMonth(now);
}

/** "November 2026". Empty for no month, so the caller can drop the label. */
export function formatMonth(validMonth: string | null | undefined): string {
  const month = normaliseMonth(validMonth);
  if (!month) return "";
  const [year, monthIndex] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/** The month after, for "Duplicate for next month". December rolls the year. */
export function nextMonth(validMonth: string): string {
  const month = normaliseMonth(validMonth);
  if (!month) return currentIstMonth();
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return monthIndex === 11
    ? toMonthValue(year + 1, 0)
    : toMonthValue(year, monthIndex + 1);
}

/** `YYYY-MM-01` → `YYYY-MM`, the value an `<input type="month">` holds. */
export function toMonthInput(validMonth: string | null | undefined): string {
  return normaliseMonth(validMonth)?.slice(0, 7) ?? "";
}

/** `YYYY-MM` from an `<input type="month">` → `YYYY-MM-01`, or null if blank. */
export function fromMonthInput(value: string): string | null {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}

/**
 * Newest month first, then the admin's display order. Packages with no month
 * come after every dated one: on a city page the monthly Umrah offers lead,
 * and anything undated is the standing offer behind them.
 */
export function compareNewestMonthFirst(
  a: { valid_month?: string | null; sort_order?: number },
  b: { valid_month?: string | null; sort_order?: number },
): number {
  const monthA = normaliseMonth(a.valid_month) ?? "";
  const monthB = normaliseMonth(b.valid_month) ?? "";
  if (monthA !== monthB) {
    if (!monthA) return 1;
    if (!monthB) return -1;
    return monthA < monthB ? 1 : -1;
  }
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

/**
 * Swap a month name in a package name for the next one, or append it.
 *
 * "15 Days Umrah from Mumbai — October 2026" duplicated for November should
 * read "… — November 2026", not "… — October 2026 — November 2026".
 */
export function renameForMonth(
  name: string,
  fromMonth: string | null | undefined,
  toMonth: string,
): string {
  const from = formatMonth(fromMonth);
  const to = formatMonth(toMonth);
  if (from && name.includes(from)) return name.replace(from, to);
  return `${name.trim()} — ${to}`;
}

function toMonthValue(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

/**
 * Accepts what PostgREST returns for a `date` (`2026-11-01`) and tolerates a
 * timestamp form, always returning the first of the month — or null for
 * anything that is not a month at all.
 */
function normaliseMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return toMonthValue(Number(match[1]), monthIndex);
}
