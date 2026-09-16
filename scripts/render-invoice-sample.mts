/**
 * Writes a sample invoice + receipt to look at with your own eyes.
 *
 * render-invoice-check.mts proves the file is structurally right; this one is
 * for the half of "right" a script cannot judge — whether the header sits
 * well, whether the payments table keeps its head, whether the policies page
 * reads as an annexure rather than as spill. Four documents, because the
 * receipt is a different document from the bill, the part-paid statement is a
 * different document again, and the bill itself now says two different things
 * depending on the Paid tick:
 *
 *   1-invoice-pending.pdf        the bill, Paid unticked — payment pending
 *   2-invoice-paid.pdf           the bill, Paid ticked — stamped PAID, no dues
 *   3-statement-part-paid.pdf    one instalment in, a balance still due
 *   4-receipt-paid-in-full.pdf   settled from the ledger, stamped PAID
 *
 *   npm run sample:pdf -- <outDir>
 *
 * The logo is downscaled through sharp (already present, Next.js depends on
 * it) because public/Logo.png is 1.8 MB and the settings form caps an upload
 * at 400 KB — a sample built from the raw file would weigh 2.4 MB and tell you
 * nothing true about what a real invoice weighs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { resolve } from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { computeInvoiceTotals } from "../src/lib/finance.ts";
import { paiseToWords } from "../src/lib/money.ts";
import { invoicePolicyLists } from "../src/lib/siteContent.ts";
import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../src/lib/invoices.ts";

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: resolve("public/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: resolve("public/fonts/NotoSans-SemiBold.ttf"), fontWeight: 600 },
  ],
});

const { default: InvoiceDocument } = await import(
  "../src/lib/pdf/InvoiceDocument.tsx"
);

const outDir = process.argv[2] ?? ".";

const business: BusinessProfileRecord = {
  legal_name: "Mufti Travels",
  trade_name: "Hajj & Umrah Tour Operators",
  address_line1: "12 Mohammed Ali Road",
  address_line2: "Near Minara Masjid",
  city: "Mumbai",
  state: "Maharashtra",
  state_code: "27",
  pincode: "400003",
  phone: "+91 93230 63712",
  email: "bookings@muftitravels.com",
  website: "muftitravels.com",
  gstin: "27AABCM1234K1Z5",
  pan: "AABCM1234K",
  bank_name: "HDFC Bank, Masjid Bunder",
  bank_account_name: "Mufti Travels",
  bank_account_number: "50200012345678",
  bank_ifsc: "HDFC0000123",
  upi_id: "muftitravels@hdfcbank",
  // Downscaled the way the settings form makes an admin do (400 KB cap), so
  // the sample weighs what a real invoice weighs rather than 2.4 MB.
  logo_data_uri: `data:image/png;base64,${(
    await sharp(readFileSync(resolve("public/Logo.png")))
      .resize({ width: 330 })
      .png({ compressionLevel: 9 })
      .toBuffer()
  ).toString("base64")}`,
  signature_data_uri: "",
  invoice_prefix: "MT",
  default_tax_mode: "cgst_sgst",
  default_tax_rate_bp: 500,
};

const items: InvoiceItemRecord[] = [
  {
    id: "i1",
    invoice_id: "inv-1",
    description:
      "Umrah Package · 14 Days · Deluxe · Makkah 4\u2605 (200m from Haram) · Madinah 4\u2605",
    sac_code: "998555",
    quantity: 4,
    unit_price_paise: 8400000,
    line_total_paise: 33600000,
    sort_order: 0,
  },
  {
    id: "i2",
    invoice_id: "inv-1",
    description: "Visa processing and Mu'allim charges",
    sac_code: "998555",
    quantity: 4,
    unit_price_paise: 1250000,
    line_total_paise: 5000000,
    sort_order: 10,
  },
  {
    id: "i3",
    invoice_id: "inv-1",
    description: "Return flights, Mumbai \u2013 Jeddah, economy",
    sac_code: "996425",
    quantity: 4,
    unit_price_paise: 3650000,
    line_total_paise: 14600000,
    sort_order: 20,
  },
];

const totals = computeInvoiceTotals({
  items: items.map((item) => ({
    quantity: item.quantity,
    unitPricePaise: item.unit_price_paise,
  })),
  discountPaise: 500000,
  taxMode: "cgst_sgst",
  taxRateBp: 500,
});

const policies = invoicePolicyLists(undefined);

const invoice: InvoiceRecord = {
  id: "inv-1",
  number: "MT/26-27/0042",
  fy_label: "26-27",
  seq: 42,
  status: "issued",
  issue_date: "2026-09-16",
  due_date: "2026-10-05",
  customer_name: "Abdul Rahman Shaikh",
  customer_phone: "+91 98200 11223",
  customer_email: "abdul.rahman@example.com",
  customer_address: "402 Zainab Manzil, Bhendi Bazaar",
  customer_state: "Maharashtra",
  customer_state_code: "27",
  customer_gstin: "",
  source_enquiry_id: null,
  source_meta_lead_id: null,
  trip_id: null,
  subtotal_paise: totals.subtotalPaise,
  discount_paise: totals.discountPaise,
  taxable_paise: totals.taxablePaise,
  tax_mode: "cgst_sgst",
  tax_rate_bp: 500,
  cgst_paise: totals.cgstPaise,
  sgst_paise: totals.sgstPaise,
  igst_paise: totals.igstPaise,
  round_off_paise: totals.roundOffPaise,
  total_paise: totals.totalPaise,
  amount_in_words: paiseToWords(totals.totalPaise),
  notes: "Passports collected. Vaccination certificates pending for two.",
  terms: "",
  paid_in_full: false,
  show_policies: true,
  policy_snapshot: policies,
  pdf_path: "",
  issued_at: "2026-09-16T09:14:00Z",
  cancelled_at: null,
  cancel_reason: "",
  created_at: "2026-09-15T10:00:00Z",
  updated_at: "2026-09-16T09:14:00Z",
};

const partPayment: InvoicePayment[] = [
  {
    id: "p1",
    invoice_id: "inv-1",
    paid_on: "2026-09-16",
    amount_paise: 16000000,
    method: "bank",
    reference: "NEFT/HDFC/8891231",
    notes: "",
    created_at: "2026-09-16T10:00:00Z",
  },
];

const fullPayment: InvoicePayment[] = [
  ...partPayment,
  {
    id: "p2",
    invoice_id: "inv-1",
    paid_on: "2026-09-29",
    amount_paise: invoice.total_paise - 16000000,
    method: "upi",
    reference: "abdulrahman@okhdfcbank",
    notes: "",
    created_at: "2026-09-29T11:30:00Z",
  },
];

const samples = [
  { file: "1-invoice-pending.pdf", payments: [], variant: "invoice" as const },
  {
    file: "2-invoice-paid.pdf",
    payments: [],
    variant: "invoice" as const,
    paidInFull: true,
  },
  {
    file: "3-statement-part-paid.pdf",
    payments: partPayment,
    variant: "receipt" as const,
  },
  {
    file: "4-receipt-paid-in-full.pdf",
    payments: fullPayment,
    variant: "receipt" as const,
  },
];

for (const sample of samples) {
  const buffer = await renderToBuffer(
    InvoiceDocument({
      invoice: { ...invoice, paid_in_full: sample.paidInFull ?? false },
      items,
      business,
      policies,
      payments: sample.payments,
      variant: sample.variant,
    }) as never,
  );
  writeFileSync(resolve(outDir, sample.file), buffer);
  console.log(`${sample.file}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
