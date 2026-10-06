/**
 * Writes sample quotations to look at with your own eyes.
 *
 * render-quotation-check.mts proves the file is structurally right; this one is
 * for the half of "right" a script cannot judge — whether the ruled table reads
 * as a table, whether a nested itinerary inside one cell looks like an itinerary
 * or like a mistake, whether the traveller counts sit under their labels.
 *
 *   1-quotation-plain.pdf      one line, no trip details — the pre-025 shape
 *   2-quotation-full.pdf       every block filled, nested itinerary, two hotels
 *   3-quotation-terms.pdf      the same with the policy annexure behind it
 *
 *   npm run sample:quotation -- <outDir>
 *
 * The logo is downscaled through sharp for the same reason render-invoice-
 * sample.mts does it: public/Logo.png is 1.8 MB, the settings form caps an
 * upload at 400 KB, and a sample built from the raw file tells you nothing true
 * about what a real quotation weighs.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { resolve } from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { computeInvoiceTotals } from "../src/lib/finance.ts";
import { paiseToWords } from "../src/lib/money.ts";
import { invoicePolicyLists } from "../src/lib/siteContent.ts";
import { resolveQuoteDiscount } from "../src/lib/quotations.ts";
import type {
  QuotationItemRecord,
  QuotationRecord,
} from "../src/lib/quotations.ts";
import type { BusinessProfileRecord } from "../src/lib/invoices.ts";

// Must precede the dynamic import below: first registration for a family wins.
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

const outDir = process.argv[2] ?? ".";

const logo = await sharp(resolve("public/Logo.png"))
  .resize({ width: 420, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer()
  .catch(() => null);

const business: BusinessProfileRecord = {
  legal_name: "Mufti Travels",
  trade_name: "Hajj & Umrah Tour Operators",
  address_line1: "12 Mohammed Ali Road",
  address_line2: "Near Minara Masjid",
  city: "Mumbai",
  state: "Maharashtra",
  state_code: "27",
  pincode: "400003",
  phone: "+91 93230 63712 / +91 93246 47786",
  email: "muftitravels786@gmail.com",
  website: "muftitravels.com",
  gstin: "27AABCM1234K1Z5",
  pan: "AABCM1234K",
  bank_name: "HDFC Bank, Masjid Bunder",
  bank_account_name: "Mufti Travels",
  bank_account_number: "50200012345678",
  bank_ifsc: "HDFC0000123",
  upi_id: "muftitravels@hdfcbank",
  logo_data_uri: logo ? `data:image/png;base64,${logo.toString("base64")}` : "",
  signature_data_uri: "",
  invoice_prefix: "MT",
  quote_prefix: "MTQ",
  quote_validity_days: 7,
  default_tax_mode: "none",
  default_tax_rate_bp: 0,
};

/* The shape the reference document puts inside ONE priced cell. */
const ROYAL = [
  "Royal Package",
  "Quint Room - Private",
  "**Inclusions**",
  "  Makkah Hotel",
  "    Makkah Tower - 9 Nights",
  "  Madinah Hotel",
  "    Nozul Rowza Al Aqeeq - 5 Nights",
  "  Transfers",
  "    Jeddah Airport to Makkah Hotel",
  "    Makkah Hotel to Madinah Hotel",
  "    Madinah Hotel to Jeddah Airport",
  "  Makkah Ziyarat",
  "    Local Ziyarat with guide",
  "  Madinah Ziyarat",
  "    Local Ziyarat with guide",
  "  Meals",
  "    Breakfast, lunch and dinner — Indian buffet",
  "  Visa",
  "  SIM card",
  "  Laundry on alternate days",
  "  Premium Umrah kit",
  "  Zam Zam water",
].join("\n");

function lines(descriptions: string[]): QuotationItemRecord[] {
  return descriptions.map((description, index) => {
    const quantity = index === 0 ? 10 : 8;
    const unit = index === 0 ? 11278600 : 0;
    return {
      id: `item-${index}`,
      quotation_id: "quo-1",
      description,
      quantity,
      unit_price_paise: unit,
      line_total_paise: Math.round((Math.round(quantity * 100) * unit) / 100),
      source_package_slug: "15-days-regular-umrah-from-mumbai",
      sort_order: index * 10,
    };
  });
}

function build(
  items: QuotationItemRecord[],
  trip: Partial<QuotationRecord>,
): QuotationRecord {
  const subtotal = items.reduce((sum, item) => sum + item.line_total_paise, 0);
  const discountPaise = resolveQuoteDiscount(subtotal, "percent", 500, 0);
  const totals = computeInvoiceTotals({
    items: items.map((item) => ({
      quantity: item.quantity,
      unitPricePaise: item.unit_price_paise,
    })),
    discountPaise,
    taxMode: "none",
    taxRateBp: 0,
  });

  return {
    id: "quo-1",
    number: "MTQ/26-27/0014",
    fy_label: "26-27",
    seq: 14,
    status: "sent",
    revision: 1,
    quote_date: "2026-10-06",
    sent_on: "2026-10-06",
    sent_at: "2026-10-06T07:00:00Z",
    valid_until: "2026-10-13",
    accepted_on: null,
    declined_reason: "",
    customer_name: "Mr Fayaz Shaikh",
    customer_phone: "+91 98192 43474",
    customer_email: "fayaz@example.com",
    customer_address: "402 Noor Manzil, Mohammed Ali Road, Mumbai 400003",
    customer_state: "Maharashtra",
    customer_state_code: "27",
    customer_gstin: "",
    departure_city: "Mumbai",
    travel_date: "2026-12-03",
    pax: 10,

    service_type: "",
    package_type: "",
    sharing_type: "",
    sales_rep_name: "",
    sales_rep_phone: "",
    return_date: null,
    duration_days: null,
    adults: 0,
    children_with_bed: 0,
    children_without_bed: 0,
    infants: 0,
    accommodation: [],

    source_enquiry_id: null,
    source_meta_lead_id: null,
    trip_id: null,
    subtotal_paise: totals.subtotalPaise,
    discount_mode: "percent",
    discount_percent_bp: 500,
    discount_paise: totals.discountPaise,
    taxable_paise: totals.taxablePaise,
    tax_mode: "none",
    tax_rate_bp: 0,
    cgst_paise: totals.cgstPaise,
    sgst_paise: totals.sgstPaise,
    igst_paise: totals.igstPaise,
    round_off_paise: totals.roundOffPaise,
    total_paise: totals.totalPaise,
    amount_in_words: paiseToWords(totals.totalPaise),
    inclusions: [
      "Return economy airfare, Mumbai – Jeddah – Mumbai",
      "Umrah visa and Mu'allim charges",
      "Daily breakfast and dinner, Indian cuisine",
      "Ziyarat in both cities by air-conditioned coach",
    ],
    exclusions: [
      "Qurbani, laundry, telephone and personal expenses",
      "Anything arising from a flight delay by the airline",
    ],
    notes: "",
    show_policies: true,
    policy_snapshot: [],
    pdf_path: "",
    converted_invoice_id: null,
    created_at: "2026-10-06T07:00:00Z",
    updated_at: "2026-10-06T07:00:00Z",
    ...trip,
  };
}

const FULL_TRIP: Partial<QuotationRecord> = {
  service_type: "Umrah",
  package_type: "Gold & Gold Plus Package",
  sharing_type: "Quad sharing",
  sales_rep_name: "Mohammed Rashid",
  sales_rep_phone: "+91 98192 43474",
  return_date: "2026-12-17",
  duration_days: 15,
  adults: 10,
  children_with_bed: 2,
  children_without_bed: 1,
  infants: 1,
  accommodation: [
    {
      city: "Makkah",
      hotel: "Elaf Diamond",
      distance: "300 m from Haram",
      room: "Sharing",
      nights: 9,
      check_in: "04:00 PM",
      check_out: "12:00 PM",
    },
    {
      city: "Madinah",
      hotel: "Gulnar Taiba",
      distance: "Facing Masjid an-Nabawi",
      room: "Sharing",
      nights: 5,
      check_in: "01:00 PM",
      check_out: "12:00 PM",
    },
  ],
};

const plainItems = lines(["15 Days Regular Umrah · Silver · Quad"]);
const fullItems = lines([
  ROYAL,
  "International Air Ticket\nBOM - JED\nJED - BOM\nAkasa Air",
]);

const policies = invoicePolicyLists(undefined);

const samples = [
  {
    file: "1-quotation-plain.pdf",
    quotation: build(plainItems, {}),
    items: plainItems,
    policies: [],
  },
  {
    file: "2-quotation-full.pdf",
    quotation: build(fullItems, FULL_TRIP),
    items: fullItems,
    policies: [],
  },
  {
    file: "3-quotation-terms.pdf",
    quotation: build(fullItems, FULL_TRIP),
    items: fullItems,
    policies,
  },
];

for (const sample of samples) {
  const buffer = await renderToBuffer(
    QuotationDocument({
      quotation: sample.quotation,
      items: sample.items,
      business,
      policies: sample.policies,
    }) as never,
  );
  writeFileSync(resolve(outDir, sample.file), buffer);
  console.log(`${sample.file}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
