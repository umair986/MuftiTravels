/**
 * Reporting: the shapes the three views in migration 019 return, and the
 * palette the dashboard draws with.
 *
 * Everything here aggregates in the database. The expenses screen totals a
 * bounded period in the browser, which is fine; a P&L is "every invoice and
 * every expense, grouped", which is not a thing to ship to a phone to add up.
 */

import type { ExpenseCategoryKind, TripStatus } from "./finance";

export type TripFinancials = {
  trip_id: string;
  name: string;
  category: string;
  departure_date: string | null;
  return_date: string | null;
  status: TripStatus;
  invoiced_paise: number;
  invoice_count: number;
  received_paise: number;
  outstanding_paise: number;
  spent_paise: number;
  expense_count: number;
  margin_paise: number;
};

export type MonthlyFinancials = {
  month: string;
  invoiced_paise: number;
  received_paise: number;
  spent_paise: number;
  margin_paise: number;
  invoice_count: number;
  expense_count: number;
};

export type CategoryTotal = {
  month: string;
  category_id: string;
  category_name: string;
  category_kind: ExpenseCategoryKind;
  spent_paise: number;
  expense_count: number;
};

/**
 * Two series, and only ever two: invoiced against spent.
 *
 * Both amounts are rupees on one scale, so they share one axis — never two.
 * A dual-axis chart can be made to show any relationship you like by choosing
 * the scales, which is exactly why it is the most misleading chart there is.
 *
 * The pair is validated rather than chosen by eye: adjacent CVD ΔE 26.6
 * (protan) and 17.4 (tritan), normal-vision ΔE 27.6, both inside the lightness
 * band and above the chroma floor and 3:1 contrast against the surface. Colour
 * is never the only cue anyway — every bar is direct-labelled and the legend is
 * always present.
 */
export const SERIES = {
  invoiced: { color: "#997A15", label: "Invoiced" },
  spent: { color: "#2a78d6", label: "Spent" },
} as const;

/** Reserved, and never reused as a series colour. */
export const STATUS_INK = {
  positive: "#0F7B4F",
  negative: "#B3261E",
} as const;

/** "2026-08-01" -> "Aug 2026". */
export function monthLabel(month: string): string {
  const parsed = new Date(`${month.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? month
    : parsed.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Longest bar in the set, so every bar is drawn against one shared scale. */
export function scaleMax(values: number[]): number {
  return Math.max(1, ...values.map((value) => Math.abs(value)));
}

/** Percentage width for a bar, floored so a tiny non-zero value stays visible. */
export function barWidth(value: number, max: number): string {
  if (!value) return "0%";
  return `${Math.max(1.5, (Math.abs(value) / max) * 100)}%`;
}
