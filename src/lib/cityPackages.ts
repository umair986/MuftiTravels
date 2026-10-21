export type CityGroup = {
  /** A DEPARTURE_CITIES key, or "" for packages not tied to a city. */
  city: CityKey | "";
  packages: CmsPackageRecord[];
};

/**
 * A category page's packages split by departure city: cities in the order the
 * site lists them (Mumbai first), packages with no city last. Order within a
 * city is the order given, so the caller's month-then-price sort survives.
 * A city key not in DEPARTURE_CITIES counts as no city, rather than as a
 * heading the site has no page for.
 */
export function groupByCity(packages: CmsPackageRecord[]): CityGroup[] {
  const known = new Set<string>(DEPARTURE_CITIES.map((city) => city.key));
  const cityOf = (item: CmsPackageRecord) => {
    const key = packageCity(item);
    return known.has(key) ? key : "";
  };
  const groups: CityGroup[] = DEPARTURE_CITIES.map((city) => ({
    city: city.key,
    packages: packages.filter((item) => cityOf(item) === city.key),
  }));
  groups.push({
    city: "",
    packages: packages.filter((item) => cityOf(item) === ""),
  });
  return groups.filter((group) => group.packages.length);
}

/**
 * Which packages belong to a departure city, and how they are ordered.
 *
 * Shared by the home page's city cards and the city pages, so the "from" price
 * on a card is the same number as the one at the top of the page it opens.
 * Expired months are already gone by the time packages reach here — the select
 * policy and getPublicCatalog() both drop them — so nothing below filters by
 * date. See docs/monthly-packages.md.
 */

import type { CmsPackageRecord } from "@/lib/packages";
import { cheapestPrice, type CheapestPrice } from "@/lib/cityLanding";
import {
  DEPARTURE_CITIES,
  MONTHLY_CATEGORY,
  compareNewestMonthFirst,
  formatDepartureDates,
  formatPeriod,
  packageCity,
  packageEndMonth,
  type CityKey,
} from "@/lib/departures";

export function packagesForCity(
  packages: CmsPackageRecord[],
  city: CityKey,
): CmsPackageRecord[] {
  return packages
    .filter((item) => packageCity(item) === city)
    .sort(compareNewestMonthFirst);
}

/** The city's Umrah fixed groups, newest month first. */
export function monthlyUmrah(
  packages: CmsPackageRecord[],
  city: CityKey,
): CmsPackageRecord[] {
  return packagesForCity(packages, city).filter(
    (item) => item.category === MONTHLY_CATEGORY,
  );
}

/**
 * The lowest price the city is quoting right now, across every current month.
 *
 * Across months rather than from the newest alone: "from ₹X" is a promise that
 * something costs X, and if October is cheaper than November and both are
 * still on sale, October's price is the true floor.
 */
export function cityFromPrice(
  packages: CmsPackageRecord[],
  city: CityKey,
): (CheapestPrice & { record: CmsPackageRecord }) | undefined {
  let best: (CheapestPrice & { record: CmsPackageRecord }) | undefined;
  for (const record of monthlyUmrah(packages, city)) {
    const cell = cheapestPrice(record.prices ?? {});
    if (cell && (!best || cell.amount < best.amount)) best = { ...cell, record };
  }
  return best;
}

export type MonthGroup = {
  /**
   * Identifies the period: `YYYY-MM-01` for one month, `YYYY-MM-01..YYYY-MM-01`
   * for a run of months (migration 028), or null for packages with no month.
   */
  month: string | null;
  /** "November 2026", "November–December 2026", or "" for the undated group. */
  label: string;
  packages: CmsPackageRecord[];
};

/**
 * Consecutive runs of one period, in the order given (newest first). A
 * November package and a November–December package are two groups: they are
 * two different offers, and the heading has to say which months each covers.
 */
export function groupByMonth(packages: CmsPackageRecord[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const record of packages) {
    const start = record.valid_month ?? null;
    const end = packageEndMonth(record);
    const month = start && end && end !== start ? `${start}..${end}` : start;
    const last = groups.at(-1);
    if (last && last.month === month) {
      last.packages.push(record);
    } else {
      groups.push({ month, label: formatPeriod(record), packages: [record] });
    }
  }
  return groups;
}

/**
 * What a period's heading says about flights: every departure date across its
 * packages, and each airline once. Empty when the packages carry none — a row
 * from before migration 028, or one the admin has not filled in.
 */
export function flightSummary(packages: CmsPackageRecord[]): {
  dates: string;
  airlines: string[];
} {
  const dates = formatDepartureDates(
    packages.flatMap((item) => item.departure_dates ?? []),
  );
  const airlines = [
    ...new Set(
      packages.map((item) => (item.airline ?? "").trim()).filter(Boolean),
    ),
  ];
  return { dates, airlines };
}
