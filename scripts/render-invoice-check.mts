/**
 * Renders the real InvoiceDocument and checks the things that would otherwise
 * only be discovered on a customer's invoice. Run with `npm run test:pdf`.
 *
 * What it asserts, per case:
 *   - a valid PDF comes out at all
 *   - text is drawn with EMBEDDED GLYPH IDS, not WinAnsi bytes. This is the
 *     rupee-sign trap: under the PDF core fonts "₹100" silently becomes "¹100",
 *     because U+20B9 truncates to the byte 0xb9 and WinAnsi maps that to a
 *     superscript one. It renders, it looks plausible, and it is wrong.
 *   - a 40-line invoice paginates, which is the reason @react-pdf/renderer was
 *     chosen over jsPDF in the first place
 *   - total = taxable + cgst + sgst + igst + roundOff, the same identity the
 *     invoices_total_balances CHECK enforces in the database
 *
 * Two bits of plumbing, both about Node rather than about the code under test:
 * it is bundled with esbuild (pdfkit external, so its #standard-fonts subpath
 * imports still resolve from node_modules), and the fonts are registered from
 * disk BEFORE InvoiceDocument loads, since the first registration for a family
 * wins and the app's own points at browser paths.
 */
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { computeInvoiceTotals } from "../src/lib/finance.ts";
import { paiseToWords } from "../src/lib/money.ts";
import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoiceRecord,
} from "../src/lib/invoices.ts";

// Must precede the dynamic import below: first registration wins.
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

const business: BusinessProfileRecord = {
  legal_name: "Mufti Travels Private Limited",
  trade_name: "Mufti Travels",
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
  bank_account_name: "Mufti Travels Private Limited",
  bank_account_number: "50200012345678",
  bank_ifsc: "HDFC0000123",
  upi_id: "muftitravels@hdfcbank",
  logo_data_uri: "",
  signature_data_uri: "",
  invoice_prefix: "MT",
  invoice_terms: "50% advance on booking. Balance 21 days before departure.",
  default_tax_mode: "cgst_sgst",
  default_tax_rate_bp: 500,
};

function build(itemCount: number, taxMode: "none" | "cgst_sgst" | "igst") {
  const items: InvoiceItemRecord[] = Array.from(
    { length: itemCount },
    (_, index) => ({
      id: `item-${index}`,
      invoice_id: "inv-1",
      description:
        index % 3 === 0
          ? "Umrah Package · 14 Days · Deluxe · Makkah 4★ (Hilton Suites, 200m from Haram) · Madinah 4★"
          : `Visa processing and Mu'allim charges — pilgrim ${index + 1}`,
      sac_code: "998555",
      quantity: index % 4 === 0 ? 2.5 : 1,
      unit_price_paise: 8400000 + index * 1337,
      line_total_paise: 0,
      sort_order: index * 10,
    }),
  ).map((item) => ({
    ...item,
    line_total_paise: Math.round(
      (Math.round(item.quantity * 100) * item.unit_price_paise) / 100,
    ),
  }));

  const totals = computeInvoiceTotals({
    items: items.map((item) => ({
      quantity: item.quantity,
      unitPricePaise: item.unit_price_paise,
    })),
    discountPaise: 700000,
    taxMode,
    taxRateBp: taxMode === "none" ? 0 : 500,
  });

  const invoice: InvoiceRecord = {
    id: "inv-1",
    number: "MT/26-27/0042",
    fy_label: "26-27",
    seq: 42,
    status: "issued",
    issue_date: "2026-08-31",
    due_date: "2026-09-14",
    customer_name: "Abdul Rahman Shaikh",
    customer_phone: "+91 98200 11223",
    customer_email: "abdul.rahman@example.com",
    customer_address: "402 Zainab Manzil, Bhendi Bazaar",
    customer_state: taxMode === "igst" ? "Uttar Pradesh" : "Maharashtra",
    customer_state_code: taxMode === "igst" ? "09" : "27",
    customer_gstin: "",
    source_enquiry_id: null,
    source_meta_lead_id: null,
    trip_id: null,
    subtotal_paise: totals.subtotalPaise,
    discount_paise: totals.discountPaise,
    taxable_paise: totals.taxablePaise,
    tax_mode: taxMode,
    tax_rate_bp: taxMode === "none" ? 0 : 500,
    cgst_paise: totals.cgstPaise,
    sgst_paise: totals.sgstPaise,
    igst_paise: totals.igstPaise,
    round_off_paise: totals.roundOffPaise,
    total_paise: totals.totalPaise,
    amount_in_words: paiseToWords(totals.totalPaise),
    notes: "Passports collected. Vaccination certificates pending for 2.",
    terms: "",
    pdf_path: "",
    issued_at: "2026-08-31T09:14:00Z",
    cancelled_at: null,
    cancel_reason: "",
    created_at: "2026-08-30T10:00:00Z",
    updated_at: "2026-08-31T09:14:00Z",
  };

  return { invoice, items, totals };
}

function pageCount(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

/** Does any drawn string use multi-byte glyph ids (embedded font) rather than WinAnsi? */
function usesEmbeddedGlyphs(buffer: Buffer): boolean {
  const text = buffer.toString("latin1");
  let index = 0;
  for (;;) {
    const start = text.indexOf("stream", index);
    if (start === -1) return false;
    const bodyStart = start + (text[start + 6] === "\r" ? 8 : 7);
    const end = text.indexOf("endstream", bodyStart);
    if (end === -1) return false;
    try {
      const inflated = inflateSync(buffer.subarray(bodyStart, end)).toString(
        "latin1",
      );
      // A byte-encoded core font draws <b9...>; an embedded subset draws
      // 4-hex-digit glyph ids, so the hex string length is a multiple of 4 and
      // is much longer than the visible character count.
      const hex = inflated.match(/<([0-9a-f]{8,})>/i);
      if (hex && hex[1].length % 4 === 0) return true;
    } catch {
      /* font file or raw stream */
    }
    index = end + 9;
  }
}

const cases = [
  { name: "no GST, 3 lines", count: 3, mode: "none" as const },
  { name: "CGST+SGST, 3 lines", count: 3, mode: "cgst_sgst" as const },
  { name: "IGST, 3 lines", count: 3, mode: "igst" as const },
  { name: "CGST+SGST, 40 lines", count: 40, mode: "cgst_sgst" as const },
];

let failures = 0;

for (const testCase of cases) {
  const { invoice, items, totals } = build(testCase.count, testCase.mode);
  try {
    const buffer = await renderToBuffer(
      InvoiceDocument({ invoice, items, business }) as never,
    );

    const pages = pageCount(buffer);
    const glyphs = usesEmbeddedGlyphs(buffer);
    const identityHolds =
      totals.totalPaise ===
      totals.taxablePaise +
        totals.cgstPaise +
        totals.sgstPaise +
        totals.igstPaise +
        totals.roundOffPaise;

    const ok =
      buffer.subarray(0, 5).toString("latin1") === "%PDF-" &&
      pages >= 1 &&
      glyphs &&
      identityHolds &&
      (testCase.count < 20 || pages > 1);

    if (!ok) failures += 1;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${testCase.name.padEnd(22)} ` +
        `pages=${pages} bytes=${String(buffer.length).padStart(6)} ` +
        `embeddedGlyphs=${glyphs} identity=${identityHolds} ` +
        `total=${(totals.totalPaise / 100).toFixed(2)}`,
    );
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL  ${testCase.name} threw: ${error instanceof Error ? error.message : error}`,
    );
  }
}

console.log(failures ? `\n${failures} case(s) failed` : "\nall cases passed");
