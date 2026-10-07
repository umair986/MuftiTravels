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
  MONTHLY_CATEGORY,
  compareNewestMonthFirst,
  formatMonth,
  packageCity,
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
  /** `YYYY-MM-01`, or null for packages with no month. */
  month: string | null;
  /** "November 2026", or "" for the undated group. */
  label: string;
  packages: CmsPackageRecord[];
};

/** Consecutive runs of one month, in the order given (newest first). */
export function groupByMonth(packages: CmsPackageRecord[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const record of packages) {
    const month = record.valid_month ?? null;
    const last = groups.at(-1);
    if (last && last.month === month) {
      last.packages.push(record);
    } else {
      groups.push({ month, label: formatMonth(month), packages: [record] });
    }
  }
  return groups;
}
