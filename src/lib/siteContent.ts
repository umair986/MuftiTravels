/**
 * Site content lists — inclusions, policies and important notes.
 *
 * These used to be a hardcoded module (components/policyData.ts). They now
 * live in one global table, so an edit in the dashboard changes every package
 * page at once. That "same everywhere" behaviour is deliberate: there is one
 * payment policy, not one per package.
 *
 * A list belongs to a SECTION, which is the tab it renders under. Sections are
 * fixed here because the app renders them; the lists inside a section are
 * data, so a new one can be added without a deploy.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ContentTone = "gold" | "emerald" | "rose";

export type SiteContentList = {
  id: string;
  section: ContentSection;
  key: string;
  title: string;
  tone: ContentTone;
  items: string[];
  sort_order: number;
};

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

export const CONTENT_SECTIONS = {
  inclusions: {
    /** The tab label on a package page. */
    label: "Inclusions",
    hint: "What the price covers, and what it does not.",
    /** Short lists read well side by side; long sentences do not. */
    layout: "columns",
  },
  policies: {
    label: "Policies",
    hint: "Payment and cancellation terms, shown on every package.",
    layout: "stacked",
  },
  notes: {
    label: "Important notes",
    hint: "Travel reminders and the documents a pilgrim must carry.",
    layout: "stacked",
  },
} as const;

export type ContentSection = keyof typeof CONTENT_SECTIONS;

export const CONTENT_SECTION_KEYS = Object.keys(
  CONTENT_SECTIONS,
) as ContentSection[];

/* -------------------------------------------------------------------------- */
/* Tones                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The admin picks a tone, the app owns the classes — a heading can never be
 * given an off-brand colour from the dashboard.
 */
export const CONTENT_TONES = {
  gold: { label: "Gold", swatch: "#D4AF37" },
  emerald: { label: "Green", swatch: "#1D7A4C" },
  rose: { label: "Red", swatch: "#C0392B" },
} as const;

export const CONTENT_TONE_KEYS = Object.keys(CONTENT_TONES) as ContentTone[];

/* -------------------------------------------------------------------------- */
/* Keys                                                                       */
/* -------------------------------------------------------------------------- */

/** Mirrors public.taxonomy_slugify in the database. */
export function slugifyContentKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------------------------------------------------------- */
/* Fallback                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The text as it was hardcoded, kept as a last resort.
 *
 * Used when the table is empty or unreachable — before migration 011 has been
 * run, or if Supabase is down — so a package page never renders an empty
 * Policies tab. Migration 011 seeds the database with exactly this.
 */
export const DEFAULT_CONTENT_LISTS: SiteContentList[] = [
  {
    id: "default-inclusions",
    section: "inclusions",
    key: "inclusions",
    title: "What is included",
    tone: "emerald",
    sort_order: 10,
    items: [
      "Return Flights in Economy Class",
      "Visa & Insurance",
      "Hotels Stay",
      "Breakfast, Lunch & Dinner",
      "Airport Pickup & Drop",
      "Round Trip Transfer",
      "Taif Visit on SIC Basis",
      "Badar Visit on SIC Basis",
      "Laundry Services",
      "Local Ziyarats in Makkah on SIC Basis",
      "Local Ziyarats in Madina on SIC Basis",
      "Rowda Permit",
      "Saudi Sim (Talk Time Haji will Pay)",
      "Local staff at your service",
      "24/7 customer support",
      "Complimentary 5 liters ZAM-ZAM",
      "Welcome Kit",
    ],
  },
  {
    id: "default-exclusions",
    section: "inclusions",
    key: "exclusions",
    title: "Not included",
    tone: "rose",
    sort_order: 20,
    items: [
      "Private Transfers",
      "GST 5% & TCS 5%",
      "Additional charges on excess luggage",
      "Tour operator/guide not accountable for lost luggage",
      "No room service",
      "Services not indicated in this package",
      "No refund on unutilized services",
      "No refund for curtailed stay",
    ],
  },
  {
    id: "default-payment-policy",
    section: "policies",
    key: "payment-policy",
    title: "Payment policy",
    tone: "gold",
    sort_order: 10,
    items: [
      "A minimum of Rs. 40,000 per person must be paid to secure a booking if the departure date is after 21 days.",
      "50% of the total amount is due 21 to 30 days before departure.",
      "Full payment is required 21 days before departure, or the booking will be canceled without prior notice.",
      "The tour cost remains the same for bookings through Agents, but the company is not responsible for any cash transactions with Agents.",
      "For bookings within 21 days of departure, 100% payment is required.",
      "For advance bookings, 100% payment must be cleared at least 21 days before departure.",
      "No tickets will be issued if the payment for tickets is not completed 21 days before departure, in accordance with airline regulations.",
      "Indian passport valid for at least 6 months having minimum 2 blank pages.",
      "Pan card copy (Linked with Aadhar Number).",
    ],
  },
  {
    id: "default-cancellation-policy",
    section: "policies",
    key: "cancellation-policy",
    title: "Cancellation policy",
    tone: "rose",
    sort_order: 20,
    items: [
      "Rs. 40,000 per person is non-refundable.",
      "50% of the package amount is non-refundable if canceled 21 to 30 days before departure.",
      "100% of the package amount is non-refundable if canceled within 21 days of departure.",
      "Date change charges: Rs. 10,000 per person, plus any applicable additional charges, for changes made 21 to 30 days before departure. Otherwise, the cancellation policies apply.",
      "No date changes are allowed within 20 days of departure; cancellations apply.",
    ],
  },
  {
    id: "default-travel-notes",
    section: "notes",
    key: "travel-notes",
    title: "Important travel notes",
    tone: "gold",
    sort_order: 10,
    items: [
      "Influenza and meningitis vaccination is compulsory and take vaccination 10 days prior to travel.",
      "While traveling to carry all original documents is compulsory.",
      "In case of package booked without umrah visa through us, then transportation will be subject to availability.",
      "Extra luggage other than mentioned on ticket would be paid by the pilgrim.",
      "Unutilized services are Non-refundable.",
      "Rooms Allotment as per hotel management, no room choice will be entertained.",
      "Flight Tickets can be availed at an approximate additional cost of INR 36,500. The final price, however, is subject to the fare at the time of ticket issuance.",
      "Rooms Check-In time at 04 PM and Check-Out time at 12 PM (Saudi Local time).",
    ],
  },
  {
    id: "default-required-documents",
    section: "notes",
    key: "required-documents",
    title: "Required documents",
    tone: "emerald",
    sort_order: 20,
    items: [
      "Passport",
      "VISA (Saudi Multiple/ Umrah)",
      "Both original vaccination certificate (taken 10 days prior)",
      "Along with photo copies of all documents.",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

export async function fetchContentLists(
  supabase: SupabaseClient,
): Promise<SiteContentList[]> {
  const { data } = await supabase
    .from("site_content_lists")
    .select("*")
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data as SiteContentList[]) ?? [];
}

/* -------------------------------------------------------------------------- */
/* Rendering helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Falls back to the built-in text rather than rendering an empty tab. */
export function contentOrDefaults(
  lists: SiteContentList[] | undefined,
): SiteContentList[] {
  return lists?.length ? lists : DEFAULT_CONTENT_LISTS;
}

/** The lists in one section, in the order the dashboard put them. */
export function listsInSection(
  lists: SiteContentList[],
  section: ContentSection,
): SiteContentList[] {
  return lists
    .filter((list) => list.section === section)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * The tabs worth showing. A section whose lists have all been deleted is
 * dropped, so the dashboard can never leave an empty tab behind.
 */
export function sectionsWithContent(
  lists: SiteContentList[],
): ContentSection[] {
  return CONTENT_SECTION_KEYS.filter((section) =>
    lists.some((list) => list.section === section && list.items.length > 0),
  );
}
