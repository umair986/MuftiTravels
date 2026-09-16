/**
 * Invoices: row shapes, defaults, and the small pieces of logic the editor and
 * the list both need.
 *
 * Nothing here imports from the package catalogue, and nothing ever will —
 * every field on an invoice is typed by the admin (Decision 5 in
 * docs/finance-expenses-and-invoicing.md). The only shortcut is a line preset,
 * which copies text into a line and is then forgotten.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  TaxMode,
} from "./finance";
import { formatRupees } from "./money";
import type { InvoicePolicyList } from "./siteContent";

export type InvoiceItemRecord = {
  id: string;
  invoice_id: string;
  description: string;
  sac_code: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
  sort_order: number;
};

export type InvoiceRecord = {
  id: string;
  number: string | null;
  fy_label: string | null;
  seq: number | null;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;

  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_state: string;
  customer_state_code: string;
  customer_gstin: string;

  source_enquiry_id: string | null;
  source_meta_lead_id: string | null;
  trip_id: string | null;

  subtotal_paise: number;
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

  notes: string;

  /* `terms` is gone from this type on purpose. The column still exists and
     `select *` still returns it — migration 022 keeps it, because issued
     invoices hold text there that was printed and sent — but nothing in the
     app reads or writes it any more, and a field on the type is a standing
     invitation to start again. */

  /**
   * What this invoice states about payment: settled, or pending.
   *
   * Set by the admin, NOT derived from invoice_payments. The invoice goes out
   * once the money has cleared and part payments are what receipts are for, so
   * the bill needs one plain statement rather than a running balance — and it
   * has to still be true a year later, when the ledger has moved on.
   *
   * The editor warns when this and the payments ledger disagree.
   */
  paid_in_full: boolean;

  /**
   * Whether this invoice prints the site's policies and important notes.
   *
   * A package bill should; a standalone visa fee or a ticket reissue should
   * not, which is why this is per-invoice rather than a business setting.
   */
  show_policies: boolean;
  /**
   * The policy text as it read when this invoice was issued.
   *
   * Written by issue_invoice() and frozen by the guard trigger (migration
   * 021), never by this app. A draft's is empty, and the editor renders the
   * live lists in its place so the preview shows what issuing will capture.
   */
  policy_snapshot: InvoicePolicyList[];

  pdf_path: string;

  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
};

/**
 * One row of public.invoice_balances (migration 018).
 *
 * `is_overdue` is computed in the view against current_date rather than here,
 * because the browser's today is whatever the viewer's device says it is.
 */
export type InvoiceBalance = {
  id: string;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  payment_status: PaymentStatus;
  invoice_status: InvoiceStatus;
  number: string | null;
  customer_name: string;
  customer_phone: string;
  issue_date: string | null;
  due_date: string | null;
  is_overdue: boolean;
  last_payment_on: string | null;
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  paid_on: string;
  amount_paise: number;
  method: PaymentMethod;
  reference: string;
  notes: string;
  created_at: string;
};

export type BusinessProfileRecord = {
  legal_name: string;
  trade_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  upi_id: string;
  logo_data_uri: string;
  signature_data_uri: string;
  invoice_prefix: string;
  default_tax_mode: TaxMode;
  default_tax_rate_bp: number;
};

export type LinePreset = {
  id: string;
  label: string;
  description: string;
  sac_code: string;
  default_unit_price_paise: number;
  sort_order: number;
  is_active: boolean;
};

/** A line as the editor holds it: always has an id, so saves can upsert. */
export type EditableItem = {
  id: string;
  description: string;
  sac_code: string;
  /** Held as typed text; parsed on save so a half-typed "1." is not read as 1. */
  quantity: string;
  unitPrice: string;
};

export const INVOICE_PAGE_SIZE = 25;

/** Blank line, ready to type into. */
export function blankItem(): EditableItem {
  return {
    id: newId(),
    description: "",
    sac_code: "",
    quantity: "1",
    unitPrice: "",
  };
}

/**
 * Client-generated ids let a save upsert every line and then delete only the
 * ones that were actually removed. The alternative — delete all, re-insert —
 * loses the whole invoice if the second half fails.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Older Safari. Only ever used as a row id, never as a security token.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Storage object path for an issued invoice's PDF.
 *
 * The invoice number contains slashes (MT/26-27/0042), which Supabase storage
 * would read as folders. Flattened, and prefixed with the row id so two
 * invoices can never collide even if a number were somehow reused.
 *
 * The paid state is part of the path for the same reason the payment set is
 * part of a receipt's: the invoices bucket has no update policy, on purpose —
 * a PDF that has been sent to a customer may not be rewritten. Marking an
 * issued invoice paid therefore writes a SECOND file beside the first rather
 * than replacing it. The old one still opens from the link the customer was
 * given, which is correct: it is what they were sent.
 */
export function invoicePdfPath(
  invoiceId: string,
  number: string,
  paidInFull = false,
): string {
  const base = `${invoiceId}/${number.replace(/\//g, "-")}`;
  return paidInFull ? `${base}-paid.pdf` : `${base}.pdf`;
}

/**
 * Storage object path for a receipt.
 *
 * The invoices bucket has no update policy on purpose — an issued PDF is the
 * document the customer received and may not be rewritten. A receipt is
 * regenerated every time a payment lands, so it cannot share that path and
 * cannot overwrite anything either. The answer is one file per payment state:
 * the signature below changes whenever a payment is added, edited or removed,
 * so re-sharing an unchanged receipt lands on the file that already exists (the
 * caller signs it instead of uploading), and a changed one writes a new file.
 *
 * Older receipts stay behind, which is correct rather than untidy: each one was
 * sent to a customer and should still open from the link they were given.
 */
export function receiptPdfPath(
  invoiceId: string,
  number: string,
  payments: InvoicePayment[],
): string {
  return `${invoiceId}/receipts/${number.replace(/\//g, "-")}-${receiptSignature(payments)}.pdf`;
}

/**
 * A short, stable fingerprint of a payment set. Not a security token — it only
 * has to differ when the printed rows would differ, which the amount, the date
 * and the row id between them cover.
 */
export function receiptSignature(payments: InvoicePayment[]): string {
  const source = payments
    .map((row) => `${row.id}:${row.paid_on}:${row.amount_paise}:${row.method}`)
    .join("|");

  // FNV-1a. Deterministic across browsers, unlike anything hash-order based.
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${payments.length}-${hash.toString(36)}`;
}

/** How long an invoice link shared over WhatsApp stays valid. */
export const INVOICE_LINK_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * WhatsApp deep link carrying the invoice.
 *
 * A wa.me link cannot take an attachment, so the message carries a signed URL
 * instead — which is the reason the PDF is uploaded to storage on issue rather
 * than only being handed to the browser as a download.
 *
 * Bare ten-digit numbers are assumed Indian, matching lib/metaLeads.ts.
 */
export function whatsappInvoiceUrl({
  phone,
  name,
  number,
  totalPaise,
  link,
}: {
  phone: string;
  name: string;
  number: string;
  totalPaise: number;
  link: string;
}): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;

  const message = [
    `As-salamu alaykum ${name || ""}`.trim() + ",",
    `Please find your invoice ${number} from Mufti Travels for ${formatRupees(totalPaise, { trimZeroPaise: true })}.`,
    link,
    "This link is valid for 7 days.",
  ].join("\n\n");

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * The same deep link for a receipt.
 *
 * Separate from the invoice message because the two say opposite things: one
 * asks for money, the other confirms it arrived. Sending "please find your
 * invoice" to somebody who has just cleared their balance is the kind of small
 * wrongness a customer remembers.
 */
export function whatsappReceiptUrl({
  phone,
  name,
  number,
  paidPaise,
  balancePaise,
  link,
}: {
  phone: string;
  name: string;
  number: string;
  paidPaise: number;
  balancePaise: number;
  link: string;
}): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;

  const settled = balancePaise <= 0;
  const message = [
    `As-salamu alaykum ${name || ""}`.trim() + ",",
    settled
      ? `Thank you — we have received ${formatRupees(paidPaise, { trimZeroPaise: true })} in full against invoice ${number}. There are no dues pending. Your receipt:`
      : `We have received ${formatRupees(paidPaise, { trimZeroPaise: true })} against invoice ${number}. The balance is ${formatRupees(balancePaise, { trimZeroPaise: true })}. Your statement:`,
    link,
    "This link is valid for 7 days.",
  ].join("\n\n");

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * Start a draft from an enquiry or a Meta lead.
 *
 * The customer details are COPIED into editable fields, once. The draft never
 * reads the lead again, and correcting a misspelled name on the invoice does
 * not touch the enquiry — the two source ids exist only to answer "did this
 * lead convert?".
 *
 * Returns the new invoice id, or null after reporting nothing (the caller
 * surfaces the error, since it owns the toast).
 */
export async function createDraftFromLead(
  supabase: SupabaseClient,
  seed: {
    name: string;
    phone: string;
    email?: string;
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
    .from("invoices")
    .insert({
      customer_name: (seed.name ?? "").slice(0, 200),
      customer_phone: (seed.phone ?? "").slice(0, 32),
      customer_email: (seed.email ?? "").slice(0, 200),
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

/** Indian GST state codes, for the place-of-supply picker. */
export const GST_STATE_CODES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export function stateNameForCode(code: string): string {
  return GST_STATE_CODES.find((entry) => entry.code === code)?.name ?? "";
}
