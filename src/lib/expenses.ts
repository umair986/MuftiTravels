/**
 * Expenses: row shapes, period filters and the CSV column list.
 *
 * No React and no Supabase client — the screens bring their own. This module
 * is the shared vocabulary between the expenses list, the form dialog and
 * (later) the per-trip P&L.
 */

import type { ExpenseCategoryKind, PaymentMethod } from "./finance";
import { fyLabel, fyRange } from "./finance";

// Re-exported so the expenses screens keep importing their types from one
// place; the definition lives in finance.ts because invoices tag to it too.
export type { Trip } from "./finance";

/** Matches the storage bucket's limit in migration 017. */
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/**
 * Rows fetched per period. Client-side aggregation needs the whole filtered
 * set, so this is a ceiling rather than a page size — see PERIOD_CAP_NOTICE.
 */
export const EXPENSE_FETCH_CAP = 2000;

export const PERIOD_CAP_NOTICE =
  `Only the most recent ${EXPENSE_FETCH_CAP.toLocaleString("en-IN")} expenses are shown, ` +
  `so the totals below cover those rows only. Narrow the period to see a complete total.`;

/** How many rows the list shows at once. Paged in the browser, not the database. */
export const EXPENSE_PAGE_SIZE = 25;

export type ExpenseCategory = {
  id: string;
  name: string;
  kind: ExpenseCategoryKind;
  sort_order: number;
  is_active: boolean;
};

export type ExpenseRecord = {
  id: string;
  spent_on: string;
  category_id: string;
  trip_id: string | null;
  vendor: string;
  description: string;
  amount_paise: number;
  original_currency: string;
  original_amount_minor: number | null;
  fx_rate: number | null;
  payment_method: PaymentMethod;
  reference: string;
  receipt_path: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

/** What the form hands back. `id` present means edit, absent means create. */
export type ExpenseDraft = {
  id?: string;
  spent_on: string;
  category_id: string;
  trip_id: string | null;
  vendor: string;
  description: string;
  amount_paise: number;
  original_currency: string;
  original_amount_minor: number | null;
  fx_rate: number | null;
  payment_method: PaymentMethod;
  reference: string;
  receipt_path: string;
  notes: string;
};

/* -------------------------------------------------------------------------- */
/* Periods                                                                    */
/* -------------------------------------------------------------------------- */

export const EXPENSE_PERIODS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_fy", label: "This financial year" },
  { value: "all", label: "All time" },
] as const;

export type ExpensePeriod = (typeof EXPENSE_PERIODS)[number]["value"];

/** Local-time YYYY-MM-DD. toISOString() would shift the day in IST. */
export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The inclusive date range a period covers, or null for "all time".
 *
 * Built from local dates rather than UTC because `spent_on` is a plain date —
 * an expense entered on the 1st in India must not fall into the previous month
 * because the browser converted midnight to the day before.
 */
export function periodRange(
  period: ExpensePeriod,
  today = new Date(),
): { from: string; to: string } | null {
  if (period === "all") return null;

  if (period === "this_fy") {
    return fyRange(fyLabel(today));
  }

  const monthOffset = period === "last_month" ? -1 : 0;
  const start = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1,
  );
  // Day zero of the next month is the last day of this one.
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { from: toDateInput(start), to: toDateInput(end) };
}

export function periodLabel(period: ExpensePeriod, today = new Date()): string {
  if (period === "all") return "all time";
  if (period === "this_fy") return `FY ${fyLabel(today)}`;
  const range = periodRange(period, today);
  if (!range) return "all time";
  return new Date(`${range.from}T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Object path for a receipt. Namespaced by user like the gallery's, and by
 * date so a year's receipts are not one flat directory in the dashboard.
 */
export function receiptStoragePath(
  userId: string,
  spentOn: string,
  file: File,
): string {
  const extension = (file.name.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${spentOn.slice(0, 7)}/${Date.now()}-${random}.${extension}`;
}

/** Best-effort label for an uploaded receipt, from its object path. */
export function receiptFileName(path: string): string {
  return path.split("/").pop() ?? "receipt";
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * CSV columns, in the order an accountant reads them. Amounts are exported in
 * rupees rather than paise: this file is opened in Excel, and paise integers
 * would be silently misread as rupees by whoever receives it.
 */
export const EXPENSE_CSV_COLUMNS = [
  "spent_on",
  "category",
  "kind",
  "trip",
  "vendor",
  "description",
  "amount_inr",
  "original_currency",
  "original_amount",
  "fx_rate",
  "payment_method",
  "reference",
  "has_receipt",
  "notes",
] as const;
