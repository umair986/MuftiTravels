/**
 * Departure cities and package months — see docs/monthly-packages.md.
 *
 * Pure: no Supabase, no React, no import from the catalogue, so the month
 * arithmetic stays testable on its own (departures.test.ts). Umrah prices,
 * airlines and hotels move month to month, so an Umrah package is made for one
 * month — or for a run of months whose rates were fixed together, like
 * November–December (migration 028) — and stops being shown once its last
 * month is over. Hajj and Ramadan packages carry no month and never expire.
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

/* -------------------------------------------------------------------------- */
/* Periods: a package priced for a run of months                              */
/* -------------------------------------------------------------------------- */

/**
 * A package's dates, as the rows carry them. `valid_until_month` (migration
 * 028) is the LAST month its rates cover when they cover more than one —
 * November–December rates are one package, not two. Null, or absent on a row
 * read before 028 is applied, means the package covers its one month.
 */
export type PackagePeriod = {
  valid_month?: string | null;
  valid_until_month?: string | null;
};

/** The last month a package covers, `YYYY-MM-01`, or null for an undated one. */
export function packageEndMonth(item: PackagePeriod): string | null {
  const start = normaliseMonth(item.valid_month);
  if (!start) return null;
  const end = normaliseMonth(item.valid_until_month);
  // A stray end before the start is the start: the CHECK in 028 forbids it,
  // and a row from before the CHECK should still read as one month.
  return end && end > start ? end : start;
}

/**
 * True once the LAST month a package covers is over — November–December
 * rates stay on the site through December. Mirrors the select policy in
 * migration 028; the two are a pair.
 */
export function isPackageExpired(
  item: PackagePeriod,
  now: Date = new Date(),
): boolean {
  return isMonthExpired(packageEndMonth(item), now);
}

/**
 * "November 2026", "November–December 2026", or "December 2026–January 2027"
 * across a new year. Empty for an undated package.
 */
export function formatPeriod(item: PackagePeriod): string {
  const start = normaliseMonth(item.valid_month);
  const end = packageEndMonth(item);
  if (!start || !end) return "";
  if (end === start) return formatMonth(start);
  const [startName, startYear] = formatMonth(start).split(" ");
  const [endName, endYear] = formatMonth(end).split(" ");
  return startYear === endYear
    ? `${startName}–${endName} ${endYear}`
    : `${startName} ${startYear}–${endName} ${endYear}`;
}

/** How many months a package covers: 1 for a single month, 0 for undated. */
export function periodLength(item: PackagePeriod): number {
  const start = normaliseMonth(item.valid_month);
  const end = packageEndMonth(item);
  if (!start || !end) return 0;
  const months = (value: string) =>
    Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
  return months(end) - months(start) + 1;
}

/**
 * The period after this one, the same length — what "Duplicate for next
 * month" creates. November–December becomes January–February; a single
 * month becomes the next single month. Never starts before `notBefore`
 * (this month, by default): duplicating a package whose period is long over
 * gives one that starts now rather than another one already expired.
 */
export function nextPeriod(
  item: PackagePeriod,
  notBefore: string = currentIstMonth(),
): { valid_month: string; valid_until_month: string | null } {
  const end = packageEndMonth(item);
  let start = end ? nextMonth(end) : notBefore;
  if (start < notBefore) start = notBefore;
  let last = start;
  for (let i = 1; i < Math.max(1, periodLength(item)); i += 1) {
    last = nextMonth(last);
  }
  return { valid_month: start, valid_until_month: last === start ? null : last };
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
 * Newest month first, then cheapest first. Packages with no month
 * come after every dated one: on a city page the monthly Umrah offers lead,
 * and anything undated is the standing offer behind them.
 */
export function compareNewestMonthFirst(
  a: PackagePeriod & { starting_price?: number },
  b: PackagePeriod & { starting_price?: number },
): number {
  const monthA = normaliseMonth(a.valid_month) ?? "";
  const monthB = normaliseMonth(b.valid_month) ?? "";
  if (monthA !== monthB) {
    if (!monthA) return 1;
    if (!monthB) return -1;
    return monthA < monthB ? 1 : -1;
  }
  // Same first month, different runs (November vs November–December): keep
  // each run together so the city page gives it one heading. Shorter first.
  const endA = packageEndMonth(a) ?? "";
  const endB = packageEndMonth(b) ?? "";
  if (endA !== endB) return endA < endB ? -1 : 1;
  // Then cheapest first, unpriced last. There is no hand-set display order:
  // the business sorts by month, and a hidden number in the editor would only
  // reorder packages for reasons nobody could see.
  const priceA = Number(a.starting_price) > 0 ? Number(a.starting_price) : Infinity;
  const priceB = Number(b.starting_price) > 0 ? Number(b.starting_price) : Infinity;
  return priceA === priceB ? 0 : priceA < priceB ? -1 : 1;
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
  return renameForPeriod(
    name,
    { valid_month: fromMonth },
    { valid_month: toMonth },
  );
}

/** renameForMonth for a run of months: "— November–December 2026" swaps whole. */
export function renameForPeriod(
  name: string,
  from: PackagePeriod,
  to: PackagePeriod,
): string {
  const fromLabel = formatPeriod(from);
  const toLabel = formatPeriod(to);
  if (fromLabel && name.includes(fromLabel)) {
    return name.replace(fromLabel, toLabel);
  }
  return `${name.trim()} — ${toLabel}`;
}

/**
 * Flight departure dates, as a pilgrim reads them: "5, 19 Nov · 3 Dec".
 * Dates are `YYYY-MM-DD` (a Postgres `date[]`); invalid ones are dropped,
 * the rest sorted, and the year left off — the period heading carries it.
 *
 * `limit` keeps a package card short on a phone, where a dozen dates wrapped
 * to four lines: "2, 4, 9, 11 Nov + 8 more". The package page shows them all.
 */
export function formatDepartureDates(
  dates: readonly string[] | null | undefined,
  { limit, withYear }: { limit?: number; withYear?: boolean } = {},
): string {
  const all = [...new Set(dates ?? [])]
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const valid = limit && limit > 0 ? all.slice(0, limit) : all;
  const hidden = all.length - valid.length;
  const byMonth: { key: string; label: string; days: number[] }[] = [];
  for (const value of valid) {
    const label = MONTH_NAMES[Number(value.slice(5, 7)) - 1]?.slice(0, 3);
    if (!label) continue;
    const key = value.slice(0, 7);
    const day = Number(value.slice(8, 10));
    const last = byMonth.at(-1);
    if (last && last.key === key) last.days.push(day);
    else byMonth.push({ key, label, days: [day] });
  }
  const text = byMonth
    .map(
      (group) =>
        `${group.days.join(", ")} ${group.label}${withYear ? ` ${group.key.slice(0, 4)}` : ""}`,
    )
    .join(" · ");
  return hidden > 0 ? `${text} + ${hidden} more` : text;
}

/**
 * "Saudia · Direct", "Via Muscat", or "" — the airline and routing a package
 * states (migration 028). A blank routing says nothing: never "Direct".
 * Shared by the package card and the package page so they cannot disagree.
 */
export function flightCarrier(flight: {
  airline?: string | null;
  flight_routing?: string | null;
  flight_via?: string | null;
}): string {
  const via = (flight.flight_via ?? "").trim();
  const routing =
    flight.flight_routing === "direct"
      ? "Direct"
      : flight.flight_routing === "via"
        ? via
          ? `Via ${via}`
          : "Connecting"
        : "";
  return [(flight.airline ?? "").trim(), routing].filter(Boolean).join(" · ");
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
