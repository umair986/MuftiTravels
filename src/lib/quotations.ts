/**
 * Quotations: row shapes, the small arithmetic a quote adds on top of an
 * invoice's, and the paths and links for sending one.
 *
 * Nothing here imports from the package catalogue. That coupling is real and
 * deliberate — a quotation may read the catalogue where an invoice may not — but
 * it lives exactly one directory wide, in src/app/admin/quotations/, so that the
 * grep protecting accounting records keeps passing. Decision 1 of
 * docs/quotations.md states the rule and the command that checks it; this file
 * stays clear of the literal module paths so that command does not match its own
 * documentation.
 *
 * The totals arithmetic is not reimplemented here either. computeInvoiceTotals
 * in ./finance already does "subtotal, then one whole-quote discount, then tax
 * on what remains, then round to the rupee", which is precisely what a quotation
 * needs. This module adds only the resolver that sits in front of it, and the
 * two derived figures a quotation prints that an invoice does not.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLineTotal, type TaxMode } from "./finance";
import { formatRupees } from "./money";
import type { InvoicePolicyList } from "./siteContent";
import type { InvoiceRecord } from "./invoices";

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * There is no 'cancelled'. An invoice is cancelled because its number is burned
 * and the document exists in law; a quotation that came to nothing is declined,
 * or it simply stops being valid.
 */
export const QUOTATION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]["value"];

/**
 * 'expired' is a fifth DISPLAY state over the four stored ones, derived from
 * valid_until rather than written — the same shape as PAYMENT_STATUSES layering
 * over INVOICE_STATUSES in ./finance, and for the same reason: it changes
 * without anybody updating a row.
 */
export type QuotationDisplayStatus = QuotationStatus | "expired";

export const QUOTATION_DISPLAY_STATUSES = [
  ...QUOTATION_STATUSES,
  { value: "expired", label: "Expired" },
] as const;

/** Tailwind classes per status, so a badge reads at a glance. */
export const QUOTATION_STATUS_STYLES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600 border-stone-300",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-rose-50 text-rose-700 border-rose-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
};

export const quotationStatusLabel = (value: string) =>
  QUOTATION_DISPLAY_STATUSES.find((option) => option.value === value)?.label ??
  value;

/** How the discount was expressed. See resolveQuoteDiscount. */
export const DISCOUNT_MODES = [
  { value: "none", label: "No discount" },
  { value: "percent", label: "Percentage" },
  { value: "amount", label: "Flat amount" },
] as const;

export type DiscountMode = (typeof DISCOUNT_MODES)[number]["value"];

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One city's hotel, as it was offered. Migration 025.
 *
 * Every field is text, including the times and the distance, because every one
 * of them is a sentence the business says to the customer rather than a
 * measurement: "00Mtr", "walking distance" and "opposite Gate 79" are all real
 * answers, and "12:00 PM (Saudi local time)" is the whole answer, not a `time`
 * with the important half thrown away. `nights` is the exception, because it is
 * counted and shown as a number.
 */
export type QuotationAccommodation = {
  city: string;
  hotel: string;
  distance: string;
  room: string;
  nights: number | null;
  check_in: string;
  check_out: string;
};

export type QuotationItemRecord = {
  id: string;
  quotation_id: string;
  /**
   * The line as the customer reads it, and the one field on this row that
   * carries structure. See parseDescriptionLines: the first line is the item,
   * leading spaces indent the lines under it, and **asterisks** mark a
   * sub-heading. It is still plain text in the database — the structure is a
   * rendering convention, not a schema, which is what keeps quotation_items
   * storing text and amounts only.
   */
  description: string;
  /** Pax on this line. numeric(10,2) in the database, to match invoice_items. */
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
  /**
   * Which catalogue package this line was built from — a note, not a join.
   * If it ever disagrees with `description`, `description` wins: that is what
   * the customer was sent.
   */
  source_package_slug: string;
  sort_order: number;
};

export type QuotationRecord = {
  id: string;
  number: string | null;
  fy_label: string | null;
  seq: number | null;
  status: QuotationStatus;
  /**
   * How many times this has been SENT, not edited. Owned by send_quotation()
   * and never written by this app (migration 024). It is a stored column
   * because it picks which stored PDF is the current one — see quotationPdfPath.
   */
  revision: number;

  quote_date: string;
  sent_on: string | null;
  /**
   * Not redundant with sent_on. Comparing updated_at against it is how the
   * editor can say "edited since you sent this" instead of quietly letting the
   * admin believe the customer holds the current version.
   */
  sent_at: string | null;
  valid_until: string | null;
  accepted_on: string | null;
  declined_reason: string;

  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_state: string;
  customer_state_code: string;
  customer_gstin: string;

  /** The catalogue has no departure-city field, and it is what the customer said first. */
  departure_city: string;
  travel_date: string | null;
  /** Head count for the per-person figure. Null where a head count is meaningless. */
  pax: number | null;

  /* ------------------------------------------------- trip details (025) --- */

  /** "Umrah", "Hajj", "Ziyarat". Free text: next season invents a new one. */
  service_type: string;
  /** "Gold & Gold Plus Package". Not a catalogue key — a thing that was said. */
  package_type: string;
  /** "Sharing", "Quad", "Triple Room - Private". */
  sharing_type: string;

  /** Who prepared it. A fact about the offer, not a lookup into admin_users. */
  sales_rep_name: string;
  sales_rep_phone: string;

  return_date: string | null;
  /**
   * Typed, not derived. "15 days in December" with no dates fixed is the normal
   * state of a quotation, and a derived column would print nothing for the most
   * quoted fact on the page. The editor fills it from the dates when both are
   * known — see inferDurationDays.
   */
  duration_days: number | null;

  /**
   * The breakdown behind `pax`, not a replacement for it. A child sharing a
   * parent's bed prices differently from one occupying their own, and an infant
   * occupies neither — the distinction is a bed, not an age.
   */
  adults: number;
  children_with_bed: number;
  children_without_bed: number;
  infants: number;

  accommodation: QuotationAccommodation[];

  source_enquiry_id: string | null;
  source_meta_lead_id: string | null;
  trip_id: string | null;

  subtotal_paise: number;
  discount_mode: DiscountMode;
  discount_percent_bp: number;
  discount_paise: number;
  taxable_paise: number;
  tax_mode: TaxMode;
  tax_rate_bp: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  round_off_paise: number;
  total_paise: number;
  amount_in_words: string;

  inclusions: string[];
  exclusions: string[];
  notes: string;

  show_policies: boolean;
  /** Written by send_quotation(), never by this app. A draft's is empty. */
  policy_snapshot: InvoicePolicyList[];

  pdf_path: string;
  converted_invoice_id: string | null;

  created_at: string;
  updated_at: string;
};

/** The quotation_overview view (migration 024): the list screen's source. */
export type QuotationOverview = {
  id: string;
  number: string | null;
  status: QuotationStatus;
  revision: number;
  customer_name: string;
  customer_phone: string;
  departure_city: string;
  pax: number | null;
  quote_date: string;
  sent_on: string | null;
  valid_until: string | null;
  subtotal_paise: number;
  discount_paise: number;
  total_paise: number;
  converted_invoice_id: string | null;
  pdf_path: string;
  created_at: string;
  updated_at: string;

  /* Added to the view by migration 025, so the list screen can say
     "15D · Gold Package · Rashid" without a second query per row. */
  package_type: string;
  duration_days: number | null;
  sales_rep_name: string;

  /** Computed in SQL against current_date, not against the viewer's clock. */
  is_expired: boolean;
};

/** A line as the editor holds it: always has an id, so saves can upsert. */
export type EditableQuoteItem = {
  id: string;
  description: string;
  /** Held as typed text; parsed on save so a half-typed "1." is not read as 1. */
  quantity: string;
  unitPrice: string;
  sourcePackageSlug: string;
};

export const QUOTATION_PAGE_SIZE = 25;

/* -------------------------------------------------------------------------- */
/* Arithmetic                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The whole-quote discount, resolved to paise.
 *
 * "Ten of us, so give us five percent" is one concession on the deal, not a
 * reduction on each line — so there is one figure, and computeInvoiceTotals
 * takes it from here and subtracts it before tax.
 *
 * Clamped to [0, subtotal]. A discount larger than the bill is a typo rather
 * than a credit, and letting one through would make taxable_paise negative,
 * which the database refuses anyway (quotations_discount_within_subtotal).
 *
 * The result is what gets STORED, even in percent mode. A total the customer is
 * holding must not depend on re-deriving a percentage later — see Decision 4.
 */
export function resolveQuoteDiscount(
  subtotalPaise: number,
  mode: DiscountMode,
  percentBp: number,
  amountPaise: number,
): number {
  const subtotal = Math.max(Math.trunc(subtotalPaise), 0);
  if (!subtotal) return 0;

  let raw: number;
  if (mode === "percent") {
    // Basis points against paise, as the tax lines do it: 500 bp of 11,00,000
    // rupees is 55,000 rupees, with the rounding in one place.
    const bp = Math.min(Math.max(Math.trunc(percentBp), 0), 10000);
    raw = Math.round((subtotal * bp) / 10000);
  } else if (mode === "amount") {
    raw = Math.trunc(amountPaise);
  } else {
    return 0;
  }

  return Math.min(Math.max(raw, 0), subtotal);
}

/**
 * The figure the customer actually asked for: what one person pays.
 *
 * Floored, not rounded, and printed with a "≈" by the document. A quotation
 * that implies false precision about a per-head rate invites an argument at the
 * counter, and the honest statement is that ten people at this total come to
 * about this much each.
 *
 * Null when there is no usable head count, so the caller omits the line rather
 * than printing a division by zero.
 */
export function perPersonPaise(
  totalPaise: number,
  pax: number | null,
): number | null {
  if (!pax || !Number.isFinite(pax) || pax < 1) return null;
  const total = Math.max(Math.trunc(totalPaise), 0);
  return Math.floor(total / Math.trunc(pax));
}

/**
 * Head count implied by the lines, for prefilling the pax field.
 *
 * Six on quad sharing plus four on triple is ten people, which is what the
 * admin would otherwise retype. Rounded because quantity carries two decimals
 * in the database while a head count does not; null for an empty bill so the
 * field stays blank rather than showing a confident zero.
 */
export function defaultPax(items: { quantity: number }[]): number | null {
  const total = items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
    0,
  );
  const rounded = Math.round(total);
  return rounded >= 1 ? rounded : null;
}

/* -------------------------------------------------------------------------- */
/* Trip details                                                               */
/* -------------------------------------------------------------------------- */

/**
 * "15D/14N" — the shorthand every Umrah quotation in this market carries.
 *
 * The subtraction lives here and nowhere else. A 15-day trip is 14 nights, and
 * the only interesting case is the one-day trip, which has no nights at all and
 * must not print "1D/0N" as though something were missing.
 *
 * Empty string, not a dash, for an unknown duration: the caller omits the line
 * entirely rather than printing a label with nothing after it.
 */
export function durationLabel(days: number | null | undefined): string {
  if (!days || !Number.isFinite(days) || days < 1) return "";
  const whole = Math.trunc(days);
  return whole === 1 ? "1D" : `${whole}D/${whole - 1}N`;
}

/**
 * Days between a departure and a return, counting both ends.
 *
 * Departing on the 1st and returning on the 15th is a fifteen-day trip, which
 * is how the customer counts it and how every brochure prints it — hence the
 * +1. Used by the editor to prefill duration_days when both dates are known;
 * it never overwrites a number the admin typed, because a group flying back
 * separately is a real thing and they would have to retype it every save.
 *
 * Null when either date is missing or unparseable, or when the arithmetic comes
 * out backwards — the database rejects that pair anyway.
 */
export function inferDurationDays(
  travelDate: string | null,
  returnDate: string | null,
): number | null {
  if (!travelDate || !returnDate) return null;
  const start = new Date(`${travelDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days >= 1 ? days : null;
}

/**
 * The passenger summary, as four labelled counts.
 *
 * Returns all four even when some are zero. "0 infants" is an answer the
 * customer gave; a blank is the question never having been asked, and on a
 * document that is quoting a price per bed the difference is the price. The
 * caller drops the whole block when nobody has filled any of it in — see
 * totalTravellers.
 */
export function travellerSummary(quotation: {
  adults?: number | null;
  children_with_bed?: number | null;
  children_without_bed?: number | null;
  infants?: number | null;
}): { label: string; count: number }[] {
  const count = (value: number | null | undefined) =>
    Number.isFinite(value) && (value as number) > 0 ? Math.trunc(value as number) : 0;

  return [
    { label: "Adults", count: count(quotation.adults) },
    { label: "Child (bed)", count: count(quotation.children_with_bed) },
    { label: "Child (no bed)", count: count(quotation.children_without_bed) },
    { label: "Infants", count: count(quotation.infants) },
  ];
}

/**
 * Everybody travelling, infants included.
 *
 * Deliberately NOT what pax means. pax is the head count the per-person figure
 * divides by — beds, in practice — and an infant on a lap is a traveller who is
 * not a bed. Zero here is the signal that the breakdown was never filled in,
 * which is how the renderer decides whether to print the block at all.
 */
export function totalTravellers(quotation: {
  adults?: number | null;
  children_with_bed?: number | null;
  children_without_bed?: number | null;
  infants?: number | null;
}): number {
  return travellerSummary(quotation).reduce((sum, row) => sum + row.count, 0);
}

/**
 * The head count a breakdown implies, for keeping `pax` in step with it.
 *
 * Infants are excluded: they occupy no bed, and including them would divide the
 * total by one more person than it was priced for, understating the per-person
 * figure the customer is being quoted.
 */
export function paxFromBreakdown(quotation: {
  adults?: number | null;
  children_with_bed?: number | null;
  children_without_bed?: number | null;
}): number | null {
  const rows = travellerSummary(quotation).filter(
    (row) => row.label !== "Infants",
  );
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return total >= 1 ? total : null;
}

/**
 * One item's description, unpacked into the indented lines the PDF draws.
 *
 * The reference document this table was modelled on puts a whole itinerary
 * inside one cell — a package name, the room under it, then "Inclusions" and
 * two levels of hotels, transfers, ziyarat and meals beneath that. All of it is
 * ONE priced line; splitting it into rows would put a rate and an amount beside
 * "Zam Zam Water".
 *
 * So the structure is a convention over plain text, not a schema:
 *
 *   Royal Package            <- line 0, always the item title
 *   Quint Room - Private     <- depth 0
 *   **Inclusions**           <- depth 0, bold
 *     Makkah Hotel           <- depth 1
 *       Makkah Tower - 9 N   <- depth 2
 *
 * Indent is two spaces per level, a tab counts as four, and depth is capped at
 * 3 so a stray paste cannot indent a line off the right edge of the cell.
 * Asterisk pairs mark a sub-heading, matching the only other place this
 * codebase lets copy carry emphasis (src/app/guides/RichText.tsx).
 *
 * Blank lines are dropped rather than rendered as vertical space: they arrive
 * from pasted text far more often than they are meant, and a cell that grows by
 * three empty rows is how a bill spills onto a second page.
 */
export function parseDescriptionLines(
  description: string,
): { text: string; depth: number; bold: boolean }[] {
  return (description ?? "")
    .split(/\r?\n/)
    .map((raw) => {
      const body = raw.trimEnd();
      if (!body.trim()) return null;

      const indent = body.length - body.replace(/^[ \t]+/, "").length;
      const width = body
        .slice(0, indent)
        .split("")
        .reduce((sum, char) => sum + (char === "\t" ? 4 : 1), 0);

      let text = body.trim();
      const bold = /^\*\*.+\*\*$/.test(text);
      if (bold) text = text.slice(2, -2).trim();

      return { text, depth: Math.min(Math.floor(width / 2), 3), bold };
    })
    .filter((line): line is { text: string; depth: number; bold: boolean } =>
      Boolean(line),
    );
}

/**
 * Whether a live offer has gone stale.
 *
 * Mirrors the is_expired expression in public.quotation_overview, which is the
 * one that counts — expiry is computed in SQL because the browser's "today" is
 * the viewer's device clock. This copy exists so a row the editor already holds
 * can be labelled without a round trip. THE TWO ARE A PAIR: if one changes,
 * both change.
 *
 * Only a sent quotation can expire. A draft was never promised, and an accepted
 * or declined one has already had its answer. The last valid day counts as
 * valid, which is why this is `<` and not `<=`.
 */
export function isExpired(
  status: QuotationStatus,
  validUntil: string | null,
  today: Date = new Date(),
): boolean {
  if (status !== "sent" || !validUntil) return false;
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return validUntil < stamp;
}

/** The badge a row should show: the stored status, unless it has lapsed. */
export function quotationDisplayStatus(
  status: QuotationStatus,
  isExpiredFlag: boolean,
): QuotationDisplayStatus {
  return status === "sent" && isExpiredFlag ? "expired" : status;
}

/* -------------------------------------------------------------------------- */
/* Editor helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Blank line, ready to type into. */
export function blankQuoteItem(): EditableQuoteItem {
  return {
    id: newQuoteId(),
    description: "",
    quantity: "1",
    unitPrice: "",
    sourcePackageSlug: "",
  };
}

/**
 * Client-generated ids let a save upsert every line and then delete only the
 * ones that were actually removed. Same reasoning as newId() in ./invoices, and
 * duplicated rather than imported so this module's pure half stays free of that
 * file's Supabase types.
 */
export function newQuoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Older Safari. Only ever used as a row id, never as a security token.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------- */
/* Storage and sharing                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Storage object path for one revision of a quotation's PDF.
 *
 * The revision is in the name, and that is the whole mechanism behind "a sent
 * quotation stays editable" (Decision 6). Revision 1 and revision 2 are
 * different objects; the quotations bucket has no update policy with which to
 * replace either; so the seven-day signed link a customer is already holding
 * keeps resolving to the document they were actually sent, even after the admin
 * has edited the quotation and sent a cheaper one.
 *
 * The number contains slashes (MTQ/26-27/0001), which Supabase storage would
 * read as folders. Flattened, and prefixed with the row id so two quotations
 * can never collide.
 */
export function quotationPdfPath(
  quotationId: string,
  number: string,
  revision: number,
): string {
  const name = number.replace(/\//g, "-");
  const rev = Math.max(Math.trunc(revision), 1);
  return `${quotationId}/${name}-r${rev}.pdf`;
}

/** The bucket quotation PDFs live in. Private; migration 024. */
export const QUOTATION_BUCKET = "quotations";

/** How long a quotation link shared over WhatsApp stays valid. */
export const QUOTE_LINK_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Download filename for a quotation PDF.
 *
 * The revision is only named past the first, so the common case is a clean
 * MTQ-26-27-0001.pdf and a re-send is visibly a re-send.
 */
export function quotationFileName(
  quotation: Pick<QuotationRecord, "number" | "revision" | "id">,
): string {
  const base = (quotation.number ?? quotation.id).replace(/\//g, "-");
  const suffix = quotation.revision > 1 ? `-r${quotation.revision}` : "";
  return `quotation-${base}${suffix}.pdf`;
}

/**
 * WhatsApp deep link carrying the quotation.
 *
 * Same shape as whatsappInvoiceUrl in ./invoices — a wa.me link cannot take an
 * attachment, so the message carries a signed URL, which is the reason the PDF
 * is uploaded to storage on send rather than only handed to the browser as a
 * download. Bare ten-digit numbers are assumed Indian, matching lib/metaLeads.ts.
 *
 * The wording is its own, though, because this message is doing a different job
 * from an invoice's. It is a sales message: it leads with the per-person figure,
 * because that is the number being negotiated, and it states the validity date,
 * because an offer with no expiry is not an offer.
 */
export function whatsappQuoteUrl({
  phone,
  name,
  number,
  totalPaise,
  perPersonPaise: perPerson,
  pax,
  validUntil,
  link,
}: {
  phone: string;
  name: string;
  number: string;
  totalPaise: number;
  perPersonPaise?: number | null;
  pax?: number | null;
  /** ISO date; omitted from the message when the quotation has no expiry. */
  validUntil?: string | null;
  link: string;
}): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;

  const total = formatRupees(totalPaise, { trimZeroPaise: true });
  const headline =
    perPerson && pax && pax > 1
      ? `${total} for ${pax} — about ${formatRupees(perPerson, { trimZeroPaise: true })} per person.`
      : `${total}.`;

  const message = [
    `As-salamu alaykum ${name || ""}`.trim() + ",",
    `Thank you for your enquiry. Please find quotation ${number} from Mufti Travels: ${headline}`,
    link,
    validUntil
      ? `This quotation is valid until ${formatQuoteDate(validUntil)}. The link is valid for 7 days.`
      : "This link is valid for 7 days.",
  ].join("\n\n");

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * "2026-10-10" -> "10 Oct 2026", for the WhatsApp message.
 *
 * Deliberately not formatPdfDate from src/lib/pdf/shared.tsx: importing that
 * would pull the @react-pdf/renderer module graph into every screen that wants
 * to send a message, which is the whole thing renderQuotation.ts dynamic-imports
 * to avoid.
 */
function formatQuoteDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Crossing to and from the other two documents                               */
/* -------------------------------------------------------------------------- */

/**
 * Start a quotation from an enquiry or a Meta lead.
 *
 * The lead's details are COPIED into editable fields, once, exactly as
 * createDraftFromLead does for an invoice. The quotation never reads the
 * enquiry again, and correcting a misspelled name here does not touch it — the
 * two source ids exist only to answer "did this lead convert?".
 *
 * An enquiry carries more than an invoice can use, and all of it is the start of
 * a quotation: departure_city is the first thing the customer says, and
 * adults + children is the head count the whole price turns on.
 */
export async function createQuotationFromLead(
  supabase: SupabaseClient,
  seed: {
    name: string;
    phone: string;
    email?: string;
    departureCity?: string;
    travelDate?: string | null;
    pax?: number | null;
    /** The breakdown behind pax, where the lead carried one (migration 025). */
    adults?: number | null;
    children?: number | null;
    enquiryId?: string;
    metaLeadId?: string;
  },
): Promise<{ id: string | null; error: string | null }> {
  const { data: business } = await supabase
    .from("business_profile")
    .select("default_tax_mode, default_tax_rate_bp")
    .eq("id", 1)
    .maybeSingle();

  const taxMode = (business?.default_tax_mode as TaxMode) ?? "none";

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      customer_name: (seed.name ?? "").slice(0, 200),
      customer_phone: (seed.phone ?? "").slice(0, 32),
      customer_email: (seed.email ?? "").slice(0, 200),
      departure_city: (seed.departureCity ?? "").slice(0, 120),
      travel_date: seed.travelDate ?? null,
      // A zero or negative head count would fail the pax CHECK; null is the
      // database's own way of saying "not known yet".
      pax: seed.pax && seed.pax > 0 ? Math.trunc(seed.pax) : null,

      // An enquiry asks for adults and children but not for beds, so every
      // child lands in children_with_bed — the costlier reading. An admin who
      // corrects it downward is lowering a price they have already seen, which
      // is the safe direction for a mistake to point.
      adults: Math.max(Math.trunc(seed.adults ?? 0), 0),
      children_with_bed: Math.max(Math.trunc(seed.children ?? 0), 0),

      source_enquiry_id: seed.enquiryId ?? null,
      source_meta_lead_id: seed.metaLeadId ?? null,
      tax_mode: taxMode,
      tax_rate_bp: taxMode === "none" ? 0 : (business?.default_tax_rate_bp ?? 0),
    })
    .select("id")
    .single();

  if (error || !data) return { id: null, error: error?.message ?? "Unknown error" };
  return { id: data.id as string, error: null };
}

/**
 * Turn an accepted quotation into a draft invoice.
 *
 * A COPY, not a transformation and not a link: new rows with new ids, after
 * which the two documents are independent and every invoice rule applies to the
 * invoice exactly as it did before. That is Decision 1 holding at the boundary —
 * the catalogue reaches the quotation, and the quotation reaches the invoice as
 * plain text, so the catalogue never reaches an accounting record.
 *
 * Deliberately not copied: the quote number (an invoice has its own series),
 * and inclusions / exclusions (an invoice does not print them, per Decision 8
 * of docs/finance-expenses-and-invoicing.md). sac_code is left blank for the
 * admin to fill if GST is ever switched on, because only they know it.
 *
 * Two writes, in this order: the invoice, then its lines, then the back-link on
 * the quotation. There is no client transaction, so a failure after the first
 * write leaves a draft invoice with no lines — which is visible and fixable,
 * where the other order would leave an accepted quotation claiming an invoice
 * that does not exist.
 */
export async function createInvoiceFromQuotation(
  supabase: SupabaseClient,
  quotation: QuotationRecord,
  items: QuotationItemRecord[],
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      customer_name: quotation.customer_name,
      customer_phone: quotation.customer_phone,
      customer_email: quotation.customer_email,
      customer_address: quotation.customer_address,
      customer_state: quotation.customer_state,
      customer_state_code: quotation.customer_state_code,
      customer_gstin: quotation.customer_gstin,

      source_enquiry_id: quotation.source_enquiry_id,
      source_meta_lead_id: quotation.source_meta_lead_id,
      source_quotation_id: quotation.id,
      trip_id: quotation.trip_id,

      // The money is carried over as resolved figures, not recomputed: the
      // customer accepted these numbers. The invoice editor will recompute on
      // its first save, and must arrive at the same answer — both documents run
      // computeInvoiceTotals over the same lines and the same discount.
      discount_paise: quotation.discount_paise,
      tax_mode: quotation.tax_mode,
      tax_rate_bp: quotation.tax_rate_bp,

      notes: quotation.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { id: null, error: error?.message ?? "Unknown error" };
  }

  const invoiceId = data.id as string;

  const rows = items
    .filter((item) => item.description.trim())
    .map((item, index) => ({
      invoice_id: invoiceId,
      description: item.description,
      sac_code: "",
      quantity: item.quantity,
      unit_price_paise: item.unit_price_paise,
      line_total_paise: computeLineTotal(item.quantity, item.unit_price_paise),
      sort_order: index * 10,
    }));

  if (rows.length) {
    const { error: itemsError } = await supabase.from("invoice_items").insert(rows);
    if (itemsError) return { id: invoiceId, error: itemsError.message };
  }

  const { error: linkError } = await supabase
    .from("quotations")
    .update({
      status: "accepted",
      accepted_on: new Date().toISOString().slice(0, 10),
      converted_invoice_id: invoiceId,
    })
    .eq("id", quotation.id);

  if (linkError) return { id: invoiceId, error: linkError.message };
  return { id: invoiceId, error: null };
}

/**
 * The columns a quotation editor writes, as one object.
 *
 * Takes the resolved totals rather than computing them, so that the editor's
 * live preview and what gets saved are provably the same numbers. Omits
 * `revision`, `number`, `fy_label`, `seq`, `sent_on`, `sent_at`, `valid_until`
 * and `policy_snapshot`: all of those belong to send_quotation(), and writing
 * them from here is how the two would drift.
 */
export type QuotationPatch = Omit<
  QuotationRecord,
  | "id"
  | "number"
  | "fy_label"
  | "seq"
  | "revision"
  | "sent_on"
  | "sent_at"
  | "valid_until"
  | "policy_snapshot"
  | "pdf_path"
  | "converted_invoice_id"
  | "created_at"
  | "updated_at"
>;

/** The invoice row type, re-exported so the convert screen needs one import. */
export type { InvoiceRecord };
