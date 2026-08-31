/**
 * Money: parsing, formatting and words. Integer paise throughout.
 *
 * Every rupee figure in the finance screens is an integer number of paise, and
 * this is the only module allowed to turn one into text or back. The reason is
 * arithmetic, not tidiness: 0.1 + 0.2 is not 0.3 in binary floating point, so
 * summing a few hundred line items in rupees drifts, and the drift lands on a
 * customer-facing total. Paise are exact.
 *
 * The ceiling is not a worry — a one crore invoice is 10^10 paise, and
 * Number.MAX_SAFE_INTEGER is 9 x 10^15 — but MAX_PAISE below rejects absurd
 * values anyway, because in practice they are typos rather than transactions.
 */

/** ₹10,000 crore. Anything larger is a mistyped amount, not a booking. */
export const MAX_PAISE = 1_000_000_000_000_00;

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Indian digit grouping: the last three digits, then twos.
 * 123456789 -> "12,34,56,789", not "123,456,789".
 *
 * Written by hand rather than with Intl.NumberFormat("en-IN") because that
 * takes a Number, which puts a float back in the middle of the one path this
 * module exists to keep away from floats.
 */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

type FormatOptions = {
  /** Drop ".00" on whole-rupee amounts. Off by default: invoices show paise. */
  trimZeroPaise?: boolean;
};

/** 12345650 -> "1,23,456.50". No currency symbol. */
export function formatPaise(
  paise: number,
  { trimZeroPaise = false }: FormatOptions = {},
): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.trunc(paise));
  const rupees = Math.floor(absolute / 100);
  const remainder = absolute % 100;

  const body =
    trimZeroPaise && remainder === 0
      ? groupIndian(String(rupees))
      : `${groupIndian(String(rupees))}.${String(remainder).padStart(2, "0")}`;

  return negative ? `-${body}` : body;
}

/**
 * 12345650 -> "₹1,23,456.50".
 *
 * U+20B9 is not in the PDF core fonts, so anything rendering this into a PDF
 * must register a font that carries the glyph — see src/lib/pdf/fonts.ts.
 * On screen it is fine.
 */
export function formatRupees(paise: number, options?: FormatOptions): string {
  const body = formatPaise(paise, options);
  return body.startsWith("-") ? `-₹${body.slice(1)}` : `₹${body}`;
}

/**
 * Compact form for dashboard tiles, in the units the business actually speaks:
 * 84000000 -> "₹8.4L", 250000000 -> "₹2.5Cr".
 */
export function formatRupeesCompact(paise: number): string {
  const negative = paise < 0;
  const rupees = Math.abs(Math.trunc(paise)) / 100;

  let body: string;
  if (rupees >= 10_000_000) body = `${trimTrailingZero(rupees / 10_000_000)}Cr`;
  else if (rupees >= 100_000) body = `${trimTrailingZero(rupees / 100_000)}L`;
  else if (rupees >= 1_000) body = `${trimTrailingZero(rupees / 1_000)}K`;
  else body = groupIndian(String(Math.round(rupees)));

  return `${negative ? "-" : ""}₹${body}`;
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Read a typed amount into paise. Returns null for anything unusable, so the
 * caller decides what an empty or malformed field means.
 *
 * Accepts what people actually type: "1,23,456.50", "₹ 123456", "123456.5".
 * Rejects negatives — an expense or a line item that is below zero is a
 * different concept (a refund, a credit note), not a negative amount, and
 * letting one through here would put it silently into a total.
 *
 * The last step multiplies nothing: the rupee and paise halves are read as
 * separate integers, so no float ever touches the value.
 */
export function parsePaise(input: string): number | null {
  const cleaned = String(input ?? "")
    .replace(/[₹,\s_]/g, "")
    .trim();

  if (!cleaned) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;

  const [rupees, fraction = ""] = cleaned.split(".");
  const paise =
    Number(rupees) * 100 + Number(`${fraction}00`.slice(0, 2));

  if (!Number.isSafeInteger(paise) || paise > MAX_PAISE) return null;
  return paise;
}

/** The inverse of parsePaise, for putting a stored value back into an input. */
export function paiseToInputValue(paise: number): string {
  if (!paise) return "";
  const absolute = Math.abs(Math.trunc(paise));
  return `${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Rounding                                                                   */
/* -------------------------------------------------------------------------- */

export type RoundedAmount = {
  /** The rounded total, in paise. Always a whole number of rupees. */
  total: number;
  /** What was added or removed to get there. Negative when rounding down. */
  roundOff: number;
};

/**
 * GST invoices are payable to the nearest rupee, so the paise are rounded off
 * and the adjustment is shown as its own line.
 *
 * The adjustment is returned rather than folded into the total on purpose: it
 * is printed on the invoice, and storing it separately is what lets the
 * database CHECK constraint verify that
 *   total = taxable + cgst + sgst + igst + round_off
 * still holds. Half rounds up, which is the common convention.
 */
export function roundToRupee(paise: number): RoundedAmount {
  const remainder = paise % 100;
  if (remainder === 0) return { total: paise, roundOff: 0 };
  const roundOff = remainder >= 50 ? 100 - remainder : -remainder;
  return { total: paise + roundOff, roundOff };
}

/* -------------------------------------------------------------------------- */
/* Words                                                                      */
/* -------------------------------------------------------------------------- */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

/** 0-99. */
function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

/**
 * Whole numbers in the Indian system — lakh and crore, not million and
 * billion. This is what an invoice filed in India is expected to read, and
 * getting it wrong is the kind of thing an accountant notices immediately.
 */
export function numberToIndianWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";

  const parts: string[] = [];

  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  // Recursive, so "One Hundred Twenty Crore" works rather than overflowing the
  // two-digit helper.
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${underHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${underHundred(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(underHundred(n));

  return parts.join(" ");
}

/**
 * The line printed under the total on every Indian invoice.
 * 12345650 -> "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six
 *              and Fifty Paise Only"
 */
export function paiseToWords(paise: number): string {
  const absolute = Math.abs(Math.trunc(paise));
  const rupees = Math.floor(absolute / 100);
  const remainder = absolute % 100;

  const head = `Rupees ${numberToIndianWords(rupees)}`;
  const tail = remainder
    ? ` and ${numberToIndianWords(remainder)} Paise`
    : "";

  return `${paise < 0 ? "Minus " : ""}${head}${tail} Only`;
}
