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
 *   - THE HEADER DOES NOT OVERLAP ITSELF. @react-pdf/renderer resolves a
 *     unitless lineHeight against the fontSize in the same style object, so the
 *     page's `fontSize: 9, lineHeight: 1.45` handed every descendant a 13.05pt
 *     line box — including the 16pt business name, which then drew straight
 *     over the address under it. Nothing throws; it just looks wrong on a
 *     customer's bill. The check measures the gap between the two lines in the
 *     rendered content stream and demands it clear the 16pt glyphs.
 *   - EVERY POLICY CLAUSE REACHES THE PAGE. The annexure carries the site's
 *     real payment, cancellation and travel terms — twenty-six clauses — and a
 *     block that overruns its page is dropped silently rather than throwing. A
 *     cancellation clause the customer never received is worse than one never
 *     offered, so the 8pt runs are counted against the clauses that went in.
 *   - THE BILL STAYS ON ONE PAGE. It is sent over WhatsApp, and a second page
 *     holding a signature block and nothing else is a worse document to
 *     receive. It has spilled twice, both times from one line added near the
 *     bottom, so the page count is asserted from both ends.
 *   - PAID MEANS PAID. The invoice stamps PAID only when it was marked paid,
 *     and the receipt still settles from its own payment ledger — the two
 *     documents answer different questions and have to go on doing so. This is
 *     the disagreement that prompted invoices.paid_in_full: a payment landed,
 *     the receipt said PAID, the invoice said nothing.
 *
 * Two bits of plumbing, both about Node rather than about the code under test:
 * it is bundled with esbuild (pdfkit external, so its #standard-fonts subpath
 * imports still resolve from node_modules), and the fonts are registered from
 * disk BEFORE InvoiceDocument loads, since the first registration for a family
 * wins and the app's own points at browser paths.
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
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
  default_tax_mode: "cgst_sgst",
  default_tax_rate_bp: 500,
};

function build(
  itemCount: number,
  taxMode: "none" | "cgst_sgst" | "igst",
  paidInFull = false,
) {
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
    paid_in_full: paidInFull,
    show_policies: true,
    // Empty, like a freshly issued row read back before migration 021 filled
    // it; the caller passes the live lists, which is the draft-preview path.
    policy_snapshot: [],
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

type Matrix = [number, number, number, number, number, number];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/**
 * Every string the page draws, with the size it was drawn at and where it
 * landed on the page, by walking the content stream with a CTM stack.
 *
 * Sizes and offsets are what a lineHeight bug actually corrupts — a document
 * that overlaps itself is still a valid PDF, so nothing short of measuring the
 * placements catches it.
 */
function drawnLines(buffer: Buffer): { size: number; y: number }[] {
  const text = decompressedStreams(buffer).find(
    (stream) => stream.includes("BT") && stream.includes("Tf"),
  );
  return text ? drawnLinesIn(text) : [];
}

/** The same walk, over one already-decompressed page stream. */
function drawnLinesIn(text: string): { size: number; y: number }[] {
  const lines: { size: number; y: number }[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let size = 0;
  // Tm comes BEFORE Tf in what react-pdf emits, so the size belonging to a run
  // is only known once the run is drawn. Reading it at Tm time picks up the
  // PREVIOUS run's size and shifts every measurement by one line.
  let pendingY: number | null = null;

  for (const line of text.split("\n")) {
    const token = line.trim();
    if (token === "q") stack.push([...ctm] as Matrix);
    else if (token === "Q") ctm = stack.pop() ?? ctm;

    const cm = token.match(
      /^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm$/,
    );
    if (cm) ctm = multiply(cm.slice(1).map(Number) as Matrix, ctm);

    const tf = token.match(/^\/\w+ ([\d.]+) Tf$/);
    if (tf) size = Number(tf[1]);

    const tm = token.match(
      /^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) Tm$/,
    );
    if (tm) pendingY = multiply(tm.slice(1).map(Number) as Matrix, ctm)[5];

    if (pendingY !== null && /TJ$|Tj$/.test(token)) {
      lines.push({ size, y: pendingY });
      pendingY = null;
    }
  }
  return lines;
}

function decompressedStreams(buffer: Buffer): string[] {
  const latin = buffer.toString("latin1");
  const out: string[] = [];
  let index = 0;
  for (;;) {
    const start = latin.indexOf("stream", index);
    if (start === -1) return out;
    const bodyStart = start + (latin[start + 6] === "\r" ? 8 : 7);
    const end = latin.indexOf("endstream", bodyStart);
    if (end === -1) return out;
    try {
      out.push(inflateSync(buffer.subarray(bodyStart, end)).toString("latin1"));
    } catch {
      /* a font file or an image, not a content stream */
    }
    index = end + 9;
  }
}

/* Noto Sans, per em. Ascent is what rises above a baseline, descent what hangs
 * below it — together they are the height a line of type actually occupies. */
const ASCENT = 1.069;
const DESCENT = 0.293;

/**
 * The business name is the first thing drawn after the logo, and the largest
 * thing in the header. Whatever follows it must clear its glyphs.
 *
 * Returns the baseline-to-baseline distance and the distance below which the
 * two lines start sharing pixels — the descenders of the line above reaching
 * into the ascenders of the line below.
 *
 * The lower bound is 10.5 rather than 14 because the name is set at two sizes:
 * 16pt when there is no logo, and 11pt under one, where the wordmark is
 * already carrying the brand. Both have to clear the address line under them,
 * and the 11pt case is the tighter of the two.
 */
function headerSpacing(buffer: Buffer): { gap: number; needed: number } {
  const lines = drawnLines(buffer);
  // Upper bound because a CANCELLED or PAID watermark is drawn first, at 62pt.
  // It is positioned absolutely and sits outside the flow, so it neither
  // collides with anything nor says anything about the header's spacing.
  const index = lines.findIndex((line) => line.size >= 10.5 && line.size < 30);
  if (index === -1 || index + 1 >= lines.length) return { gap: 0, needed: 1 };

  const above = lines[index];
  const below = lines[index + 1];
  return {
    // PDF user space counts upward, so the line below has the smaller y.
    gap: above.y - below.y,
    needed: above.size * DESCENT + below.size * ASCENT,
  };
}

/**
 * How many runs are drawn at one font size, across every page.
 *
 * The policy clauses are the only thing InvoiceDocument sets to 8pt, so this
 * counts them without having to decode a subset font's glyph ids back into
 * text. A wrapped clause draws more than one run, which is why the assertions
 * below are lower bounds.
 */
function linesAtSize(buffer: Buffer, size: number): number {
  return decompressedStreams(buffer)
    .filter((stream) => stream.includes("BT") && stream.includes("Tf"))
    .flatMap((stream) => drawnLinesIn(stream))
    .filter((line) => line.size === size).length;
}

/** How many times an image XObject is actually painted. */
function imageDraws(buffer: Buffer): number {
  return decompressedStreams(buffer)
    .filter((stream) => stream.includes("BT"))
    .reduce(
      (count, stream) => count + (stream.match(/\/I\d+ Do/g) ?? []).length,
      0,
    );
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

/** Instalments, which is how an Umrah package is actually paid for. */
function paymentsFor(
  totalPaise: number,
  how: "none" | "part" | "full",
): InvoicePayment[] {
  if (how === "none") return [];
  const first = Math.round(totalPaise * 0.4);
  const rows: InvoicePayment[] = [
    {
      id: "pay-1",
      invoice_id: "inv-1",
      paid_on: "2026-08-12",
      amount_paise: first,
      method: "bank",
      reference: "NEFT/HDFC/8891231",
      notes: "",
      created_at: "2026-08-12T06:00:00Z",
    },
  ];
  if (how === "full") {
    rows.push({
      id: "pay-2",
      invoice_id: "inv-1",
      paid_on: "2026-08-28",
      amount_paise: totalPaise - first,
      method: "upi",
      reference: "abdulrahman@okhdfcbank",
      notes: "",
      created_at: "2026-08-28T11:30:00Z",
    });
  }
  return rows;
}

/**
 * The site's real policies and important notes — thirty-odd clauses, several
 * of them long enough to wrap. Rendered from DEFAULT_CONTENT_LISTS rather than
 * from invented text so the check exercises the lengths that actually print.
 */
const policies = invoicePolicyLists(undefined);

/**
 * `maxPages` is the one that keeps being earned back.
 *
 * A three-line bill belongs on ONE page — it is sent over WhatsApp, and a
 * second page holding a signature block and nothing else is a worse document
 * to receive. It has spilled twice now, both times from adding a single line
 * near the bottom (the payment band, then the no-dues line), and both times
 * nothing complained. So the page count is asserted from both ends.
 */
const cases = [
  { name: "no GST, 3 lines", count: 3, mode: "none" as const, maxPages: 1 },
  {
    name: "CGST+SGST, 3 lines",
    count: 3,
    mode: "cgst_sgst" as const,
    maxPages: 1,
  },
  { name: "IGST, 3 lines", count: 3, mode: "igst" as const, maxPages: 1 },
  { name: "CGST+SGST, 40 lines", count: 40, mode: "cgst_sgst" as const },
  {
    name: "statement, part paid",
    count: 3,
    mode: "cgst_sgst" as const,
    variant: "receipt" as const,
    paid: "part" as const,
  },
  {
    name: "receipt, no dues",
    count: 3,
    mode: "cgst_sgst" as const,
    variant: "receipt" as const,
    paid: "full" as const,
  },
  {
    name: "invoice + instalments",
    count: 3,
    mode: "none" as const,
    paid: "part" as const,
    // Instalments belong on the receipt: handing them to a bill must not add
    // a table to it, so this stays one page too.
    maxPages: 1,
  },
  {
    name: "with policies",
    count: 3,
    mode: "cgst_sgst" as const,
    policies,
    // The bill stays one page; the clauses are an annexure behind it.
    minPages: 2,
    maxPages: 2,
  },
  {
    name: "policies + 40 lines",
    count: 40,
    mode: "cgst_sgst" as const,
    policies,
    minPages: 4,
  },
  {
    name: "receipt with policies",
    count: 3,
    mode: "cgst_sgst" as const,
    variant: "receipt" as const,
    paid: "full" as const,
    policies,
    minPages: 3,
  },
  {
    name: "invoice marked paid",
    count: 3,
    mode: "none" as const,
    paidFlag: true,
    maxPages: 1,
  },
];

let failures = 0;

for (const testCase of cases) {
  const { invoice, items, totals } = build(
    testCase.count,
    testCase.mode,
    testCase.paidFlag ?? false,
  );
  const payments = paymentsFor(totals.totalPaise, testCase.paid ?? "none");
  try {
    const buffer = await renderToBuffer(
      InvoiceDocument({
        invoice,
        items,
        business,
        payments,
        policies: testCase.policies,
        variant: testCase.variant ?? "invoice",
      }) as never,
    );

    const pages = pageCount(buffer);
    const glyphs = usesEmbeddedGlyphs(buffer);
    const header = headerSpacing(buffer);
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
      // The 16pt business name against the 9pt line beneath it.
      header.gap >= header.needed &&
      pages >= (testCase.minPages ?? 1) &&
      pages <= (testCase.maxPages ?? Infinity) &&
      (testCase.count < 20 || pages > 1);

    if (!ok) failures += 1;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${testCase.name.padEnd(22)} ` +
        `pages=${pages} bytes=${String(buffer.length).padStart(6)} ` +
        `embeddedGlyphs=${glyphs} identity=${identityHolds} ` +
        `header=${header.gap.toFixed(1)}/${header.needed.toFixed(1)}pt ` +
        `total=${(totals.totalPaise / 100).toFixed(2)}`,
    );
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL  ${testCase.name} threw: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/**
 * The logo is drawn ONCE, and the name once beside it.
 *
 * Worth its own case because the symptom — a logo appearing twice in the
 * header — is one a reader naturally blames on the document, and the content
 * stream is the only place that settles whether the page painted it twice or
 * the uploaded file simply contains two of them.
 *
 * The name is counted too. Mufti Travels' logo is a WORDMARK, so a header that
 * also sets the name at 16pt beneath it says "Mufti Travels" twice and looks
 * broken. Under a logo the name drops to 11pt, which is checked here as the
 * absence of any 16pt run — and the spacing check still has to hold at that
 * smaller size, where the line box is tighter.
 */
{
  const { invoice, items } = build(3, "none");
  const buffer = await renderToBuffer(
    InvoiceDocument({
      invoice,
      items,
      business: {
        ...business,
        logo_data_uri: `data:image/png;base64,${readFileSync(resolve("public/favicon.png")).toString("base64")}`,
      },
    }) as never,
  );
  const draws = imageDraws(buffer);
  const bigName = linesAtSize(buffer, 16);
  const header = headerSpacing(buffer);
  const ok = draws === 1 && bigName === 0 && header.gap >= header.needed;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${"logo, name once".padEnd(22)} ` +
      `imageDraws=${draws} runsAt16pt=${bigName} ` +
      `header=${header.gap.toFixed(1)}/${header.needed.toFixed(1)}pt`,
  );
}

/**
 * Every clause reaches the page, and `show_policies: false` really suppresses
 * them.
 *
 * The count matters because the failure this guards against is silent: a
 * policies block that overflows its page does not throw, it just stops being
 * printed, and a cancellation clause a customer never received is worse than
 * one that was never offered. Comparing the 8pt runs against the number of
 * clauses catches a truncated annexure; comparing page counts catches the
 * toggle being ignored.
 */
{
  const { invoice, items } = build(3, "none");
  const clauses = policies.reduce((sum, list) => sum + list.items.length, 0);

  const printed = await renderToBuffer(
    InvoiceDocument({ invoice, items, business, policies }) as never,
  );
  const suppressed = await renderToBuffer(
    InvoiceDocument({
      invoice: { ...invoice, show_policies: false },
      items,
      business,
      policies,
    }) as never,
  );

  const drawn = linesAtSize(printed, 8);
  const ok =
    drawn >= clauses &&
    linesAtSize(suppressed, 8) === 0 &&
    pageCount(printed) === pageCount(suppressed) + 1;

  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${"every clause printed".padEnd(22)} ` +
      `clauses=${clauses} runs=${drawn} ` +
      `suppressed=${pageCount(suppressed)}p/${linesAtSize(suppressed, 8)}runs`,
  );
}

/**
 * The invoice says PAID when, and only when, it was marked paid.
 *
 * This is the bug that prompted the flag. A payment was recorded, the receipt
 * stamped itself PAID from the ledger — and the invoice PDF, rendered and
 * frozen at issue, went on saying nothing about payment at all. Two documents
 * about the same money, disagreeing, and nothing anywhere noticed.
 *
 * The stamp is drawn at 62pt and nothing else on the page comes close, so its
 * presence is countable. The invoice is deliberately handed payments it should
 * ignore: instalments belong on the receipt, and a bill that quietly started
 * showing a running balance again would fail here.
 */
{
  const paidCase = build(3, "none", true);
  const pendingCase = build(3, "none", false);

  const paid = await renderToBuffer(
    InvoiceDocument({
      invoice: paidCase.invoice,
      items: paidCase.items,
      business,
    }) as never,
  );
  const pending = await renderToBuffer(
    InvoiceDocument({
      invoice: pendingCase.invoice,
      items: pendingCase.items,
      business,
      payments: paymentsFor(pendingCase.totals.totalPaise, "part"),
    }) as never,
  );
  // Same ledger, receipt variant: this one MUST follow the payments.
  const statement = await renderToBuffer(
    InvoiceDocument({
      invoice: pendingCase.invoice,
      items: pendingCase.items,
      business,
      payments: paymentsFor(pendingCase.totals.totalPaise, "full"),
      variant: "receipt",
    }) as never,
  );

  const stamps = (buffer: Buffer) => linesAtSize(buffer, 62);
  const ok =
    stamps(paid) > 0 &&
    stamps(pending) === 0 &&
    // The receipt still settles from its own ledger, not from the flag — the
    // two documents answer different questions and must go on doing so.
    stamps(statement) > 0 &&
    // An invoice handed payments must not grow a payments table.
    pageCount(pending) === pageCount(paid);

  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${"paid vs pending".padEnd(22)} ` +
      `invoicePaid=${stamps(paid)} invoicePending=${stamps(pending)} ` +
      `receiptFromLedger=${stamps(statement)} ` +
      `pages=${pageCount(paid)}/${pageCount(pending)}`,
  );
}

console.log(failures ? `\n${failures} case(s) failed` : "\nall cases passed");
