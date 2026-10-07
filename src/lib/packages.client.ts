/**
 * The package catalogue, read from the browser.
 *
 * `packages.server.ts` is "server-only" and cached for the public site, so an
 * admin screen cannot use it; until now every admin screen that needed packages
 * wrote its own `supabase.from("packages").select(...)`. This is the first
 * shared client-side read, and it exists for one caller: the quotation package
 * picker.
 *
 * It is deliberately a SEPARATE module from quotations.ts rather than a function
 * inside it. Decision 1 of docs/quotations.md permits a quotation to read the
 * catalogue and confines that permission to src/app/admin/quotations/; this file
 * is on the catalogue side of that line (its name matches the glob the review
 * grep uses), which is what keeps the line checkable.
 *
 * Everything here reads. Nothing writes, and nothing here is imported by the
 * invoice or PDF layers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMonthExpired } from "./departures";
import { rupeesToPaise } from "./money";
import { tierName, type PackageTierRecord } from "./taxonomy";

/**
 * `packages.prices` as it actually is on disk: tier KEY, then sharing label,
 * then a rupee number.
 *
 *   { "silver": { "Quad": 110000, "Triple": 118000, "Child(6-11)": 94000 } }
 *
 * Not TierPriceMap from src/app/components/packageData.ts, which is keyed by
 * display name ("Silver"). Migration 006 re-keyed this data to stable keys and
 * that type was never updated to match, so it is wrong about live rows — see the
 * open question in docs/quotations.md. Typing it honestly here keeps the picker
 * correct without a public-site change, and the sharing labels are free-form
 * jsonb keys with no registry behind them, so `string` is the truth.
 */
export type CataloguePrices = Record<string, Record<string, number | undefined>>;

/** A published package, in the shape the picker needs and nothing more. */
export type QuotablePackage = {
  slug: string;
  name: string;
  category: string;
  durationDays: number;
  durationNights: number;
  destinations: string;
  /** Becomes the quotation's "What's included" list, as editable text. */
  features: string[];
  prices: CataloguePrices;
};

/** One pickable rate: a tier, a sharing type, and what it costs per person. */
export type QuotableRate = {
  tierKey: string;
  /** The tier's display name, resolved through the registry, not the key. */
  tierLabel: string;
  sharing: string;
  /** Paise. Converted once, at this boundary — see Decision 3. */
  unitPricePaise: number;
};

/**
 * Every published package, cheapest fields only.
 *
 * Unpublished packages are excluded: quoting a price that is not on the website
 * is how a customer ends up holding an offer nobody meant to make. An admin who
 * genuinely wants to quote something unlisted types the line by hand, which the
 * editor allows and which is the honest route for it.
 */
export async function fetchQuotablePackages(
  supabase: SupabaseClient,
): Promise<QuotablePackage[]> {
  // `*` rather than a column list, and the month filtered here rather than in
  // the query: naming valid_month would fail the whole read on a database
  // that has not run migration 026, leaving the picker empty.
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  // An admin's read sees packages past their month (they need to, to delete
  // them); a quotation must not be priced off last month's rates.
  const now = new Date();
  return data
    .filter((row) => !isMonthExpired(row.valid_month as string | null, now))
    .map((row) => ({
      slug: (row.slug as string) ?? "",
      name: (row.name as string) ?? "",
      category: (row.category as string) ?? "",
      durationDays: (row.duration_days as number) ?? 0,
      durationNights: (row.duration_nights as number) ?? 0,
      destinations: (row.destinations as string) ?? "",
      features: (row.features as string[]) ?? [],
      prices: (row.prices as CataloguePrices) ?? {},
    }));
}

/**
 * The rates on one package, flattened and ordered the way the tier ladder is.
 *
 * Zero and missing rates are dropped rather than offered: a tier with no number
 * against a sharing type is a gap in the catalogue, and putting ₹0 in front of
 * an admin mid-phone-call is worse than not offering it.
 */
export function ratesForPackage(
  pkg: QuotablePackage,
  tiers: PackageTierRecord[],
): QuotableRate[] {
  const rates: QuotableRate[] = [];

  function collect(tierKey: string, tierLabel: string, group: string) {
    const sharingMap = pkg.prices[group];
    if (!sharingMap) return;
    for (const [sharing, rupees] of Object.entries(sharingMap)) {
      if (typeof rupees !== "number") continue;
      const unitPricePaise = rupeesToPaise(rupees);
      if (unitPricePaise <= 0) continue;
      rates.push({ tierKey, tierLabel, sharing, unitPricePaise });
    }
  }

  // Walk the registry rather than Object.keys(prices), so Super Saver comes
  // before Platinum instead of coming out in whatever order the jsonb was built.
  //
  // Accepting the display name as well as the key is not defensive padding. The
  // seed in migration 003 wrote prices keyed by name ("Silver"); migration 006
  // re-keys them to stable keys and drops anything it cannot match. A row that
  // has not been through that re-key — or one written by hand since — is still
  // in the old shape, and looking up only `tier.key` would return no rates at
  // all for it, silently. taxonomy.ts's lowestTier() hedges the same way.
  for (const tier of tiers) {
    if (pkg.prices[tier.key]) collect(tier.key, tier.name, tier.key);
    else if (pkg.prices[tier.name]) collect(tier.key, tier.name, tier.name);
  }

  // Anything in the data that matches neither a key nor a name still has to be
  // pickable: a tier deleted from package_tiers does not un-price a live package.
  for (const group of Object.keys(pkg.prices)) {
    const known = tiers.some(
      (tier) => tier.key === group || tier.name === group,
    );
    if (known) continue;
    collect(group, tierName(group, tiers), group);
  }

  return rates;
}

/** The tier keys a package actually has rates for, in ladder order. */
export function tierKeysForPackage(
  pkg: QuotablePackage,
  tiers: PackageTierRecord[],
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const rate of ratesForPackage(pkg, tiers)) {
    if (seen.has(rate.tierKey)) continue;
    seen.add(rate.tierKey);
    keys.push(rate.tierKey);
  }
  return keys;
}

/**
 * The line description a pick produces: "15 Days Umrah · Silver · Quad".
 *
 * Composed from the display name, never the key, and editable the moment it
 * lands in the editor. Run through pdfSafeText because this string's destination
 * is a PDF.
 */
export function composeLineDescription(
  pkg: QuotablePackage,
  rate: Pick<QuotableRate, "tierLabel" | "sharing">,
): string {
  return pdfSafeText([pkg.name, rate.tierLabel, rate.sharing].filter(Boolean).join(" · "));
}

/**
 * Replace characters the PDF font cannot draw.
 *
 * Noto Sans — registered in src/lib/pdf/fonts.ts, and the only font the
 * documents use — has no glyph for ★, and @react-pdf/renderer does not complain:
 * the character simply vanishes from the rendered page. Package names in this
 * catalogue contain it ("Makkah 4★"), so a line copied straight from the
 * catalogue would reach a customer reading "Makkah 4".
 *
 * Translated rather than stripped, because the star is carrying the meaning.
 */
export function pdfSafeText(value: string): string {
  return value
    .replace(/(\d)\s*[★☆]/g, "$1-star")
    .replace(/[★☆✦✧]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
