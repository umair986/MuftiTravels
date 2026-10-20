import { PackageData, TierPriceMap } from "@/app/components/packageData";
import { stayNights, type PackageDetails } from "@/lib/categoryFields";

export type CmsPackageRecord = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  image_url: string;
  duration_days: number;
  duration_nights: number;
  destinations: string;
  features: string[];
  card_tags?: string[];
  prices: TierPriceMap;
  starting_price: number;
  currency: string;
  reviews: number;
  rating: 1 | 2 | 3 | 4 | 5;
  is_published: boolean;
  sort_order: number;
  /** Category-specific fields; shape declared in lib/categoryFields.ts. */
  details?: PackageDetails;
  /** Set by the database trigger; used for sitemap lastModified. */
  updated_at?: string;
  /**
   * Migration 026. A key from DEPARTURE_CITIES, or "" for a package that is
   * not city-specific. Optional because rows read before 026 is applied lack it.
   */
  departure_city?: string;
  /**
   * Migration 026. `YYYY-MM-01` — the month this package was priced for; it
   * leaves the site when the month ends. Null for Hajj and Ramadan, which
   * never expire. See src/lib/departures.ts.
   */
  valid_month?: string | null;
  /**
   * Migration 028. The LAST month the rates cover when they cover several
   * (November–December); null for one month. Read through the period helpers
   * in src/lib/departures.ts, never on its own.
   */
  valid_until_month?: string | null;
  /** Migration 028. Flight departure dates, `YYYY-MM-DD`. */
  departure_dates?: string[];
  /** Migration 028. Free text, e.g. "Saudia". */
  airline?: string;
  /** Migration 028. "" says nothing — never assume direct. */
  flight_routing?: "" | "direct" | "via";
  /** Migration 028. The stop, when flight_routing is "via". */
  flight_via?: string;
  /**
   * Migration 027. The tier key and sharing label of the price the card
   * leads with; both "" means the lowest price. Optional because rows read
   * before 027 is applied lack them. Resolve through cardPrice(), never read
   * directly — a pick can outlive the price row it named.
   */
  card_price_tier?: string;
  card_price_sharing?: string;
};

export type CardPrice = { tier: string; sharing: string; amount: number };

/**
 * The one price a package card shows: the admin's pick when it still names a
 * priced cell, otherwise the lowest price in the table. Undefined when nothing
 * is priced yet, so the card can say "On request" rather than "₹0".
 *
 * Lowest means lowest amount across every tier and sharing — not "the first
 * sharing in the cheapest tier", which is what the card did before 027 and
 * which followed jsonb key order (sorted by key length, not by price).
 */
export function cardPrice(
  record: Pick<CmsPackageRecord, "prices"> &
    Partial<Pick<CmsPackageRecord, "card_price_tier" | "card_price_sharing">>,
): CardPrice | undefined {
  const table = (record.prices ?? {}) as Record<
    string,
    Record<string, number | undefined> | undefined
  >;
  const tier = record.card_price_tier ?? "";
  const sharing = record.card_price_sharing ?? "";
  const picked = tier && sharing ? Number(table[tier]?.[sharing]) : 0;
  if (picked > 0) return { tier, sharing, amount: picked };

  let lowest: CardPrice | undefined;
  for (const [tierKey, rooms] of Object.entries(table)) {
    for (const [room, value] of Object.entries(rooms ?? {})) {
      const amount = Number(value);
      if (amount > 0 && (!lowest || amount < lowest.amount)) {
        lowest = { tier: tierKey, sharing: room, amount };
      }
    }
  }
  return lowest;
}

const META_DESCRIPTION_MAX = 160;

/**
 * The search-result snippet for a package page: what a pilgrim compares two
 * results on — the stay and the price — rather than a sentence that differs
 * between packages only by name. Google cuts a description at about 160
 * characters, so the closing line is dropped before the facts are.
 *
 * Prices here are catalogue rupees, formatted the way the package card shows
 * them; nothing in this string is paise.
 */
export function packageMetaDescription(
  record: Pick<
    CmsPackageRecord,
    "name" | "duration_days" | "details" | "prices" | "currency"
  > &
    Partial<Pick<CmsPackageRecord, "card_price_tier" | "card_price_sharing">>,
): string {
  const { makkah, madinah } = stayNights(record.details);
  const nights = (count: number, city: string) =>
    count ? `${count} night${count === 1 ? "" : "s"} ${city}` : "";
  const stay =
    [nights(makkah, "Makkah"), nights(madinah, "Madinah")]
      .filter(Boolean)
      .join(" + ") || `${record.duration_days} days`;

  const price = cardPrice(record);
  const symbol = record.currency === "INR" ? "₹" : `${record.currency} `;
  const from = price
    ? `, from ${symbol}${price.amount.toLocaleString("en-IN")} per person`
    : "";

  const facts = `${record.name}: ${stay}${from}.`;
  const full = `${facts} Arranged by Mufti Travels, Mumbai.`;
  if (full.length <= META_DESCRIPTION_MAX) return full;
  if (facts.length <= META_DESCRIPTION_MAX) return facts;
  return `${facts.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export function cmsPackageToPackageData(record: CmsPackageRecord): PackageData {
  return {
    name: record.name,
    image: record.image_url,
    reviews: record.reviews,
    rating: record.rating,
    features: record.features,
    card_tags: record.card_tags ?? [],
    badges: [{ text: "Published", color: "bg-emerald-600" }],
    slug: record.slug,
    prices: record.prices,
    defaultPrice: cardPrice(record),
    durationDays: record.duration_days,
    durationNights: record.duration_nights,
    makkahNights: stayNights(record.details).makkah,
    madinahNights: stayNights(record.details).madinah,
  };
}
