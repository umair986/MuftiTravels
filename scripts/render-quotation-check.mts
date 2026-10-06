/**
 * Renders the real QuotationDocument and checks the things that would otherwise
 * only be discovered on a customer's quotation. Run with
 * `npm run test:quotation:pdf`.
 *
 * Nothing throws when a PDF's layout is wrong. An overlapping header, a list
 * that overruns its page and is silently dropped, a quotation that spills onto a
 * second page — all produce a perfectly valid file. So this measures the
 * rendered content stream rather than trusting it.
 *
 * What it asserts, per case:
 *   - a valid PDF comes out at all
 *   - text is drawn with EMBEDDED GLYPH IDS, not WinAnsi bytes. Same rupee trap
 *     as the invoice: under the core fonts "₹100" silently becomes "¹100".
 *   - total = taxable + cgst + sgst + igst + roundOff, the identity
 *     quotations_total_balances enforces in the database
 *   - THE HEADER DOES NOT OVERLAP ITSELF — the lineHeight trap. See the note at
 *     the top of QuotationDocument.tsx.
 *   - THE PRICE IS ON PAGE ONE, and the per-person figure is on the SAME page as
 *     the total it comes from. Unlike the invoice, this document is not held to
 *     one page: it carries inclusions, exclusions and terms that a bill does
 *     not, and two pages is a reasonable quotation. What is not reasonable is
 *     the price being what got pushed over, or a customer reading ₹10,45,000 on
 *     one page and "≈ ₹1,04,500 per person" on another and having to trust that
 *     the two belong together. Page counts are still bounded from both ends per
 *     case, so a section silently vanishing fails too.
 *   - THE PER-PERSON BAND APPEARS ONLY FOR A GROUP — never for a single
 *     traveller, never for an unknown head count, and not more than once as the
 *     group grows.
 *   - EVERY INCLUSION AND EXCLUSION REACHES THE PAGE. A customer comparing us
 *     on inclusions must see all of them, and an 8pt run that overruns its page
 *     is dropped in silence.
 *   - EVERY POLICY CLAUSE REACHES THE ANNEXURE, counted against what went in.
 *   - NO GSTIN OR PAN ON A QUOTATION. It is not a taxable supply, and printing
 *     tax identifiers on one invites it to be filed as a bill. Checked by
 *     rendering the same quotation against a profile that HAS both and showing
 *     the header did not grow the lines they would have added.
 *
 * Two of this document's font sizes are chosen so that this script can measure
 * it: the grand total is 11.5pt and the per-person band 10.5pt, both sizes used
 * nowhere else. They were 11pt first, which is also what baseStyles.strongLine
 * sets the customer's name to — so "is the total on this page?" came back true
 * on the strength of the name. A measurable layout is worth half a point.
 *
 * Two bits of plumbing, both about Node rather than the code under test: it is
 * bundled with esbuild (pdfkit external, so its #standard-fonts subpath imports
 * still resolve), and the fonts are registered from disk BEFORE the document
 * loads, since the first registration for a family wins and the app's own points
 * at browser paths.
 *
 * Like render-invoice-check.mts this counts failures and prints them rather than
 * calling process.exit. If one grows an exit code, both should.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import {
  drawnLines,
  headerSpacing,
  imageDraws,
  linesAtSize,
  pageCount,
  pagesWithSize,
  usesEmbeddedGlyphs,
} from "./pdfMeasure.mts";
import { computeInvoiceTotals } from "../src/lib/finance.ts";
import { paiseToWords } from "../src/lib/money.ts";
import { invoicePolicyLists } from "../src/lib/siteContent.ts";
import {
  perPersonPaise,
  resolveQuoteDiscount,
  type DiscountMode,
  type QuotationItemRecord,
  type QuotationRecord,
} from "../src/lib/quotations.ts";
import type { BusinessProfileRecord } from "../src/lib/invoices.ts";

// Must precede the dynamic import below: first registration wins.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: resolve("public/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: resolve("public/fonts/NotoSans-SemiBold.ttf"), fontWeight: 600 },
  ],
});

const { default: QuotationDocument } = await import(
  "../src/lib/pdf/QuotationDocument.tsx"
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
  quote_prefix: "MTQ",
  quote_validity_days: 7,
  default_tax_mode: "none",
  default_tax_rate_bp: 0,
};

const businessWithLogo: BusinessProfileRecord = {
  ...business,
  logo_data_uri: `data:image/png;base64,${readFileSync(resolve("public/favicon.png")).toString("base64")}`,
};

/** The site's real policies — thirty-odd clauses, several long enough to wrap. */
const policies = invoicePolicyLists(undefined);

const INCLUSIONS = [
  "Return economy airfare, Mumbai – Jeddah – Mumbai",
  "Umrah visa and Mu'allim charges",
  "Makkah: 4-star hotel, 200m from Haram, quad sharing",
  "Madinah: 4-star hotel, walking distance from Masjid an-Nabawi",
  "Daily breakfast and dinner, Indian cuisine",
  "Ziyarat in both cities by air-conditioned coach",
  "Guided group leader throughout the journey",
  "Zam Zam water, 5 litres per pilgrim as permitted",
];

const EXCLUSIONS = [
  "Passport fees and any charges for a lost or damaged passport",
  "Qurbani, laundry, telephone and personal expenses",
  "Anything arising from a flight delay or cancellation by the airline",
];

type Case = {
  name: string;
  lines: number;
  pax: number | null;
  taxMode: "none" | "cgst_sgst" | "igst";
  discountMode: DiscountMode;
  revision?: number;
  inclusions?: string[];
  exclusions?: string[];
  withPolicies?: boolean;
  logo?: boolean;
  noGstin?: boolean;
  minPages?: number;
  maxPages?: number;
  /** Set only where pagination legitimately pushes the totals off page 1. */
  totalsOffPageOne?: boolean;
};

function build(testCase: Case): {
  quotation: QuotationRecord;
  items: QuotationItemRecord[];
} {
  const items: QuotationItemRecord[] = Array.from(
    { length: testCase.lines },
    (_, index) => {
      const quantity = index === 0 ? (testCase.pax ?? 1) : 2;
      const unit = 11000000 + index * 400000;
      return {
        id: `item-${index}`,
        quotation_id: "quo-1",
        description:
          index === 0
            ? "15 Days Regular Umrah · Silver · Quad"
            : `Extra night in Madinah, room ${index} · Triple`,
        quantity,
        unit_price_paise: unit,
        line_total_paise: Math.round((Math.round(quantity * 100) * unit) / 100),
        source_package_slug: "15-days-regular-umrah-from-mumbai",
        sort_order: index * 10,
      };
    },
  );

  const subtotal = items.reduce((sum, item) => sum + item.line_total_paise, 0);
  const percentBp = testCase.discountMode === "percent" ? 500 : 0;
  const flat = testCase.discountMode === "amount" ? 5000000 : 0;
  const discountPaise = resolveQuoteDiscount(
    subtotal,
    testCase.discountMode,
    percentBp,
    flat,
  );

  const totals = computeInvoiceTotals({
    items: items.map((item) => ({
      quantity: item.quantity,
      unitPricePaise: item.unit_price_paise,
    })),
    discountPaise,
    taxMode: testCase.taxMode,
    taxRateBp: testCase.taxMode === "none" ? 0 : 500,
  });

  const quotation: QuotationRecord = {
    id: "quo-1",
    number: "MTQ/26-27/0001",
    fy_label: "26-27",
    seq: 1,
    status: "sent",
    revision: testCase.revision ?? 1,
    quote_date: "2026-10-03",
    sent_on: "2026-10-03",
    sent_at: "2026-10-03T07:00:00Z",
    valid_until: "2026-10-10",
    accepted_on: null,
    declined_reason: "",
    customer_name: "Abdul Rahman Shaikh",
    customer_phone: "+91 93230 63712",
    customer_email: "abdulrahman@example.com",
    customer_address: "402 Noor Manzil, Mohammed Ali Road, Mumbai 400003",
    customer_state: "Maharashtra",
    customer_state_code: "27",
    customer_gstin: "",
    departure_city: "Mumbai",
    travel_date: "2027-03-12",
    pax: testCase.pax,
    source_enquiry_id: null,
    source_meta_lead_id: null,
    trip_id: null,
    subtotal_paise: totals.subtotalPaise,
    discount_mode: testCase.discountMode,
    discount_percent_bp: percentBp,
    discount_paise: totals.discountPaise,
    taxable_paise: totals.taxablePaise,
    tax_mode: testCase.taxMode,
    tax_rate_bp: testCase.taxMode === "none" ? 0 : 500,
    cgst_paise: totals.cgstPaise,
    sgst_paise: totals.sgstPaise,
    igst_paise: totals.igstPaise,
    round_off_paise: totals.roundOffPaise,
    total_paise: totals.totalPaise,
    amount_in_words: paiseToWords(totals.totalPaise),
    inclusions: testCase.inclusions ?? INCLUSIONS,
    exclusions: testCase.exclusions ?? EXCLUSIONS,
    notes: "",
    show_policies: Boolean(testCase.withPolicies),
    policy_snapshot: [],
    pdf_path: "",
    converted_invoice_id: null,
    created_at: "2026-10-03T07:00:00Z",
    updated_at: "2026-10-03T07:00:00Z",
  };

  return { quotation, items };
}

const cases: Case[] = [
  // The scenario the feature was built for.
  {
    name: "silver, 10 pax, 5% off",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
    maxPages: 1,
  },
  {
    name: "single traveller",
    lines: 1,
    pax: 1,
    taxMode: "none",
    discountMode: "none",
    maxPages: 1,
  },
  {
    name: "no head count",
    lines: 1,
    pax: null,
    taxMode: "none",
    discountMode: "none",
    maxPages: 1,
  },
  {
    name: "flat discount",
    lines: 2,
    pax: 12,
    taxMode: "none",
    discountMode: "amount",
    maxPages: 1,
  },
  // GST adds Taxable + CGST + SGST to the totals column, which is three lines
  // of real content rather than slack, so these are allowed a second page. GST
  // is off for this business until the CA signs off on a rate, so this is the
  // speculative shape, not the common one.
  {
    name: "GST on, intra-state",
    lines: 2,
    pax: 10,
    taxMode: "cgst_sgst",
    discountMode: "percent",
    maxPages: 2,
  },
  {
    name: "GST on, inter-state",
    lines: 2,
    pax: 10,
    taxMode: "igst",
    discountMode: "percent",
    maxPages: 2,
  },
  // The tightest layout case: a logo costs a fixed 46pt whatever the image, and
  // every optional section is switched on at once.
  {
    name: "logo, all sections",
    lines: 3,
    pax: 14,
    taxMode: "cgst_sgst",
    discountMode: "percent",
    logo: true,
    maxPages: 2,
  },
  {
    name: "revision 3",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
    revision: 3,
    maxPages: 1,
  },
  // Terms are an annexure, so these must be exactly two pages: one of bill, one
  // of terms. Three would mean the quotation itself spilled.
  {
    name: "with policies",
    lines: 2,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
    withPolicies: true,
    minPages: 2,
    maxPages: 2,
  },
  {
    name: "no lists at all",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "none",
    inclusions: [],
    exclusions: [],
    maxPages: 1,
  },
  // A 25-passenger group manifest. This one is EXPECTED to paginate — it is the
  // reason @react-pdf/renderer was chosen over jsPDF.
  {
    name: "25 lines paginates",
    lines: 25,
    pax: 25,
    taxMode: "none",
    discountMode: "percent",
    minPages: 2,
    totalsOffPageOne: true,
  },
];

let failures = 0;

function report(name: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(22)} ${detail}`);
}

for (const testCase of cases) {
  const { quotation, items } = build(testCase);
  const profile = testCase.logo ? businessWithLogo : business;

  const buffer = await renderToBuffer(
    QuotationDocument({
      quotation,
      items,
      business: profile,
      policies: testCase.withPolicies ? policies : [],
    }) as never,
  );

  const pages = pageCount(buffer);
  const glyphs = usesEmbeddedGlyphs(buffer);
  const header = headerSpacing(buffer);

  // THE INVARIANT THAT ACTUALLY MATTERS, and the reason the page budgets above
  // are not all 1. A quotation may legitimately run to two pages — it carries
  // inclusions, exclusions and terms that an invoice does not — but the PRICE
  // must not be what got pushed over, and the per-person figure must never be
  // separated from the total it is derived from. A customer looking at ₹10,45,000
  // on one page and "≈ ₹1,04,500 per person" on another has to take it on trust
  // that the two belong together.
  //
  // The grand total is the only 11.5pt run in the document and the per-person
  // band the only 10.5pt one, which is why those two sizes are what they are.
  // Both were 11pt first, and this check could not then tell the total apart
  // from the customer's name.
  const totalPages = pagesWithSize(buffer, 11.5);
  const perPersonPages = pagesWithSize(buffer, 10.5);
  const perPersonExpected = Boolean(quotation.pax && quotation.pax > 1);

  const totalDrawnOnce = totalPages.length === 1;
  // A 25-passenger manifest genuinely pushes the totals to page 2, which is the
  // whole reason a real layout engine was chosen. Everything else owes page 1.
  const totalPlaced =
    totalDrawnOnce &&
    (testCase.totalsOffPageOne === true ? true : totalPages[0] === 0);
  const perPersonPlaced = perPersonExpected
    ? perPersonPages.length === 1 && perPersonPages[0] === totalPages[0]
    : perPersonPages.length === 0;

  const identityHolds =
    quotation.total_paise ===
    quotation.taxable_paise +
      quotation.cgst_paise +
      quotation.sgst_paise +
      quotation.igst_paise +
      quotation.round_off_paise;

  const ok =
    buffer.subarray(0, 5).toString("latin1") === "%PDF-" &&
    pages >= 1 &&
    glyphs &&
    identityHolds &&
    header.gap >= header.needed &&
    totalPlaced &&
    perPersonPlaced &&
    pages >= (testCase.minPages ?? 1) &&
    pages <= (testCase.maxPages ?? Infinity);

  report(
    testCase.name,
    ok,
    `pages=${pages} bytes=${String(buffer.length).padStart(6)} ` +
      `embeddedGlyphs=${glyphs} identity=${identityHolds} ` +
      `header=${header.gap.toFixed(1)}/${header.needed.toFixed(1)}pt ` +
      `totalPage=${totalPages.join(",") || "none"} perPerson=${perPersonPlaced} ` +
      `total=${(quotation.total_paise / 100).toFixed(2)}`,
  );
}

/* ---------------------------------------------------------------------------
 * The per-person band: drawn for a group, never otherwise.
 *
 * It is the only thing on the page set to 10.5pt, which is why that size was
 * chosen — the band's runs can be counted directly instead of inferred from a
 * diff of 11pt runs, which was the first attempt and was wrong: react-pdf splits
 * a run at a font-subset boundary, so "≈ ₹1,04,500" is not one run and the diff
 * was never going to be the predictable 2.
 *
 * The count is still not asserted as an exact number for that same reason. What
 * is asserted is the bug class that matters: the band appears when there is a
 * group, disappears for a single traveller and for an unknown head count, and
 * does not multiply as the group grows.
 * ------------------------------------------------------------------------- */
{
  async function bandRuns(pax: number | null): Promise<number> {
    const built = build({
      name: "x",
      lines: 1,
      pax,
      taxMode: "none",
      discountMode: "percent",
    });
    const buffer = await renderToBuffer(
      QuotationDocument({ ...built, business, policies: [] }) as never,
    );
    return linesAtSize(buffer, 10.5);
  }

  const ten = await bandRuns(10);
  const forty = await bandRuns(40);
  const solo = await bandRuns(1);
  const unknown = await bandRuns(null);

  const built = build({
    name: "x",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
  });
  const expected = perPersonPaise(built.quotation.total_paise, 10);

  report(
    "per person band",
    ten > 0 && ten === forty && solo === 0 && unknown === 0 && expected !== null,
    `pax10=${ten} pax40=${forty} solo=${solo} noPax=${unknown} ` +
      `perPerson=${((expected ?? 0) / 100).toFixed(2)}`,
  );
}

/* ---------------------------------------------------------------------------
 * Every inclusion and exclusion reaches the page.
 *
 * Both lists are the only thing this document sets to 8pt outside the annexure,
 * so counting 8pt runs counts them — without having to decode a subset font's
 * glyph ids back into text. A wrapped item draws more than one run, so the
 * assertion is a lower bound; dropping one would put the count UNDER it.
 * ------------------------------------------------------------------------- */
{
  const withLists = build({
    name: "x",
    lines: 2,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
  });
  const withoutLists = build({
    name: "x",
    lines: 2,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
    inclusions: [],
    exclusions: [],
  });

  const withBuffer = await renderToBuffer(
    QuotationDocument({ ...withLists, business, policies: [] }) as never,
  );
  const withoutBuffer = await renderToBuffer(
    QuotationDocument({ ...withoutLists, business, policies: [] }) as never,
  );

  const expectedItems = INCLUSIONS.length + EXCLUSIONS.length;
  const runs = linesAtSize(withBuffer, 8);
  const suppressed = linesAtSize(withoutBuffer, 8);

  report(
    "lists all printed",
    runs >= expectedItems && suppressed === 0,
    `items=${expectedItems} runs=${runs} suppressed=${suppressed}`,
  );
}

/* ---------------------------------------------------------------------------
 * Every policy clause reaches the annexure.
 *
 * In the annexure the clauses are 8pt too, so this counts the inclusions as
 * well — hence comparing against a render with the lists emptied, which isolates
 * the clause count.
 * ------------------------------------------------------------------------- */
{
  const built = build({
    name: "x",
    lines: 2,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
    withPolicies: true,
    inclusions: [],
    exclusions: [],
  });

  const buffer = await renderToBuffer(
    QuotationDocument({ ...built, business, policies }) as never,
  );

  const clauses = policies.reduce((sum, list) => sum + list.items.length, 0);
  const runs = linesAtSize(buffer, 8);

  report(
    "every clause printed",
    clauses > 0 && runs >= clauses,
    `clauses=${clauses} runs=${runs}`,
  );
}

/* ---------------------------------------------------------------------------
 * No GSTIN or PAN on a quotation.
 *
 * A quotation is not a taxable supply; printing tax identifiers on one invites a
 * customer — or their accountant — to treat it as a bill. BusinessBlock is given
 * showTaxIds={false}, and the way to prove that took effect is to render the
 * same quotation against a profile that HAS a GSTIN and a PAN and show the
 * header did not grow the two lines they would have added.
 * ------------------------------------------------------------------------- */
{
  const built = build({
    name: "x",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "none",
  });

  const withIds = await renderToBuffer(
    QuotationDocument({ ...built, business, policies: [] }) as never,
  );
  const withoutIds = await renderToBuffer(
    QuotationDocument({
      ...built,
      business: { ...business, gstin: "", pan: "" },
      policies: [],
    }) as never,
  );

  const a = drawnLines(withIds).length;
  const b = drawnLines(withoutIds).length;

  report(
    "no tax ids printed",
    a === b,
    `runsWithGstin=${a} runsWithout=${b} (equal means suppressed)`,
  );
}

/* ---------------------------------------------------------------------------
 * The logo is drawn once, and does not also set a 16pt name beside it.
 *
 * Same trap as the invoice: the logo is a WORDMARK, so a 16pt "Mufti Travels"
 * under it says the name twice at two sizes. BusinessBlock handles this, and the
 * check is here because the quotation is the document most likely to be looked
 * at by somebody who has never seen one of ours before.
 * ------------------------------------------------------------------------- */
{
  const built = build({
    name: "x",
    lines: 1,
    pax: 10,
    taxMode: "none",
    discountMode: "percent",
  });

  const buffer = await renderToBuffer(
    QuotationDocument({
      ...built,
      business: businessWithLogo,
      policies: [],
    }) as never,
  );

  const draws = imageDraws(buffer);
  const runsAt16 = linesAtSize(buffer, 16);

  report(
    "logo, name once",
    draws === 1 && runsAt16 === 0,
    `imageDraws=${draws} runsAt16pt=${runsAt16}`,
  );
}

console.log(
  failures ? `\n${failures} case(s) failed` : "\nall cases passed",
);
