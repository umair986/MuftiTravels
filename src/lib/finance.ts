/**
 * Finance: shared vocabulary, the financial year, and invoice arithmetic.
 *
 * Everything here is pure. No Supabase, no React, no imports from the package
 * catalogue — see the import rule in docs/finance-expenses-and-invoicing.md.
 * That is deliberate: computeInvoiceTotals is the one function in this project
 * where being wrong is both customer-facing and legally relevant, so it is
 * kept testable in isolation (src/lib/finance.test.ts).
 */

import { roundToRupee } from "./money";

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]["value"];

/**
 * Derived in the invoice_balances view, not stored. 'draft' and 'cancelled'
 * pass through from the invoice status, because asking whether an unissued
 * document is paid is not a meaningful question.
 */
export const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Part paid" },
  { value: "paid", label: "Paid" },
] as const;

export type PaymentStatus =
  | (typeof PAYMENT_STATUSES)[number]["value"]
  | InvoiceStatus;

export const PAYMENT_METHODS = [
  { value: "bank", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

/**
 * Which tax columns an invoice carries.
 *
 *   none       no GST — a plain invoice or bill of supply
 *   cgst_sgst  supply within our own state: half the rate each
 *   igst       supply to another state: the full rate in one line
 *
 * Which of the last two applies is decided by comparing our state code to the
 * customer's place of supply, not chosen by hand. See resolveTaxMode.
 */
export const TAX_MODES = [
  { value: "none", label: "No GST" },
  { value: "cgst_sgst", label: "CGST + SGST (within state)" },
  { value: "igst", label: "IGST (other state)" },
] as const;

export type TaxMode = (typeof TAX_MODES)[number]["value"];

export const EXPENSE_CATEGORY_KINDS = [
  { value: "trip", label: "Trip cost" },
  { value: "operating", label: "Operating cost" },
] as const;

export type ExpenseCategoryKind =
  (typeof EXPENSE_CATEGORY_KINDS)[number]["value"];

export const TRIP_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number]["value"];

/**
 * A departure, as the pickers need it. Lives here rather than in expenses.ts or
 * invoices.ts because both tag to it — it is the row that lets the two ledgers
 * meet, so it belongs to neither of them.
 */
export type Trip = {
  id: string;
  name: string;
  category: string;
  departure_date: string | null;
  status: TripStatus;
};

/** Tailwind classes per status, so a badge reads at a glance. */
export const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600 border-stone-300",
  issued: "bg-sky-50 text-sky-700 border-sky-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  unpaid: "bg-[#FFFCF3] text-[#997A15] border-[#D4AF37]",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function labelFrom(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export const invoiceStatusLabel = (value: string) =>
  labelFrom(INVOICE_STATUSES, value);
export const paymentStatusLabel = (value: string) =>
  labelFrom([...PAYMENT_STATUSES, ...INVOICE_STATUSES], value);
export const paymentMethodLabel = (value: string) =>
  labelFrom(PAYMENT_METHODS, value);
export const taxModeLabel = (value: string) => labelFrom(TAX_MODES, value);
export const tripStatusLabel = (value: string) => labelFrom(TRIP_STATUSES, value);

/* -------------------------------------------------------------------------- */
/* Financial year                                                             */
/* -------------------------------------------------------------------------- */

/**
 * India runs 1 April to 31 March, so a date in February belongs to the year
 * that began the previous April.
 *
 *   2026-08-31 -> "26-27"   2027-02-10 -> "26-27"   2027-04-01 -> "27-28"
 *
 * This mirrors public.fy_label() in migration 017. The database is the one
 * that actually stamps an invoice; this copy exists so the UI can label a
 * filter and preview a number without a round trip. If one ever changes, both
 * change.
 */
export function fyLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const year = d.getFullYear();
  // getMonth() is zero-based, so March is 2 and April is 3.
  const startYear = d.getMonth() >= 3 ? year : year - 1;
  const two = (value: number) => String(value % 100).padStart(2, "0");
  return `${two(startYear)}-${two(startYear + 1)}`;
}

/** The first and last day of a financial year, for date-range filters. */
export function fyRange(label: string): { from: string; to: string } {
  const startTwo = Number(label.slice(0, 2));
  // Two-digit years are unambiguous here: this business did not invoice in 1926.
  const startYear = 2000 + startTwo;
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

/* -------------------------------------------------------------------------- */
/* Invoice arithmetic                                                         */
/* -------------------------------------------------------------------------- */

export type TotalsInput = {
  /** Quantity and unit price as typed. Quantity may have two decimal places. */
  items: { quantity: number; unitPricePaise: number }[];
  discountPaise: number;
  taxMode: TaxMode;
  /** Basis points: 500 = 5%, 1800 = 18%. */
  taxRateBp: number;
};

export type InvoiceTotals = {
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number;
  totalPaise: number;
};

/**
 * quantity x unit price, in paise.
 *
 * Quantity carries two decimals in the database, so it is scaled to an integer
 * before multiplying and divided back afterwards. Multiplying 2.4 by a paise
 * figure directly would reintroduce exactly the float error this codebase
 * spends an integer representation avoiding.
 */
export function computeLineTotal(
  quantity: number,
  unitPricePaise: number,
): number {
  const hundredths = Math.round(quantity * 100);
  return Math.round((hundredths * unitPricePaise) / 100);
}

/**
 * The whole of an invoice's money, computed in one place.
 *
 * Order matters and is fixed by how GST is assessed: discount comes off before
 * tax, tax is charged on what remains, and the payable is rounded to the
 * nearest rupee last. Under CGST+SGST each half is computed at half the rate
 * rather than by halving the total, which is how the GST portal does it and
 * avoids an orphan paise when the total tax is odd.
 *
 * The returned figures always satisfy
 *   total = taxable + cgst + sgst + igst + roundOff
 * which is the same identity the invoices_total_balances CHECK enforces in the
 * database. If this function is wrong, the insert fails rather than a bad
 * total reaching a customer.
 */
export function computeInvoiceTotals({
  items,
  discountPaise,
  taxMode,
  taxRateBp,
}: TotalsInput): InvoiceTotals {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + computeLineTotal(item.quantity, item.unitPricePaise),
    0,
  );

  // A discount larger than the bill is a typo, not a credit. Clamping here
  // keeps taxable_paise non-negative, which the database also insists on.
  const discount = Math.min(Math.max(Math.trunc(discountPaise), 0), subtotalPaise);
  const taxablePaise = subtotalPaise - discount;

  const rate = taxMode === "none" ? 0 : Math.max(Math.trunc(taxRateBp), 0);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (rate > 0 && taxMode === "cgst_sgst") {
    // Half the rate each: 20000 = 10000 basis points x 2.
    cgstPaise = Math.round((taxablePaise * rate) / 20000);
    sgstPaise = cgstPaise;
  } else if (rate > 0 && taxMode === "igst") {
    igstPaise = Math.round((taxablePaise * rate) / 10000);
  }

  const beforeRounding = taxablePaise + cgstPaise + sgstPaise + igstPaise;
  const { total, roundOff } = roundToRupee(beforeRounding);

  return {
    subtotalPaise,
    discountPaise: discount,
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    roundOffPaise: roundOff,
    totalPaise: total,
  };
}

/**
 * Intra-state or inter-state, decided from the two state codes rather than
 * left to whoever is typing.
 *
 * Returns 'none' when GST is switched off for the business, and when the
 * customer's place of supply has not been filled in — guessing at that would
 * put the wrong tax on a real invoice, so the UI asks instead.
 */
export function resolveTaxMode(
  businessStateCode: string,
  customerStateCode: string,
  gstEnabled: boolean,
): TaxMode {
  if (!gstEnabled) return "none";
  const ours = businessStateCode.trim();
  const theirs = customerStateCode.trim();
  if (!ours || !theirs) return "none";
  return ours === theirs ? "cgst_sgst" : "igst";
}

/** 500 -> "5%", 1800 -> "18%", 250 -> "2.5%". */
export function formatTaxRate(basisPoints: number): string {
  const percent = basisPoints / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0$/, "")}%`;
}
