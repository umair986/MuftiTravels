/**
 * Tier and tag registries.
 *
 * Packages reference tiers and tags by STABLE KEY (`super-saver`, `best-seller`),
 * never by display name. That is what makes renaming Super Saver to Budget a
 * one-row update instead of a hand edit across every price row on every package.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PackageTierRecord = {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  /**
   * Migration 028: where this tier's hotels are. Optional because a row read
   * before 028 is applied lacks them; "" and 0 mean say nothing.
   */
  makkah_distance?: string;
  madinah_distance?: string;
  /** Migration 030: the tie-up hotel, optional; "" names none. */
  makkah_hotel?: string;
  madinah_hotel?: string;
  hotel_stars?: number;
  highlights?: string[];
  /** The tier a package page's "Where you'll stay" tabs mark as recommended. */
  is_recommended?: boolean;
};

/** The hotel facts a package may set for one of its tiers (migration 032). */
export const HOTEL_FIELDS = [
  "makkah_hotel",
  "makkah_distance",
  "madinah_hotel",
  "madinah_distance",
] as const;

export type HotelField = (typeof HOTEL_FIELDS)[number];

/** Per tier key; a blank or missing field means "use the tier's". */
export type PackageTierHotels = Record<
  string,
  Partial<Record<HotelField, string>>
>;

/**
 * The registry as one package sees it: each tier's hotel facts overridden by
 * whatever the package names for that tier (migration 032). Blank fields
 * fall back, so a package with no overrides sees the registry unchanged. The
 * jsonb is read defensively — only strings under the four known keys count.
 */
export function withPackageHotels(
  registry: PackageTierRecord[],
  overrides: PackageTierHotels | null | undefined,
): PackageTierRecord[] {
  if (!overrides || typeof overrides !== "object") return registry;
  return registry.map((tier) => {
    const own = overrides[tier.key] ?? overrides[tier.name];
    if (!own || typeof own !== "object") return tier;
    const next = { ...tier };
    for (const field of HOTEL_FIELDS) {
      const value = own[field];
      if (typeof value === "string" && value.trim()) next[field] = value.trim();
    }
    return next;
  });
}

/**
 * What a package saves to tier_hotels: trimmed, blank fields dropped, and
 * only for tiers it is still priced in — a hotel for a tier the package no
 * longer sells would sit in the row unseen.
 */
export function cleanTierHotels(
  hotels: PackageTierHotels,
  pricedTiers: Iterable<string>,
): PackageTierHotels {
  const priced = new Set(pricedTiers);
  const cleaned: PackageTierHotels = {};
  for (const [tierKey, own] of Object.entries(hotels)) {
    if (!priced.has(tierKey) || !own) continue;
    const kept: Partial<Record<HotelField, string>> = {};
    for (const field of HOTEL_FIELDS) {
      const value = own[field]?.trim();
      if (value) kept[field] = value.slice(0, 120);
    }
    if (Object.keys(kept).length) cleaned[tierKey] = kept;
  }
  return cleaned;
}

export type PackageTagRecord = {
  id: string;
  key: string;
  label: string;
  color: TagColor;
  sort_order: number;
};

/* -------------------------------------------------------------------------- */
/* Colour swatches                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The admin picks a swatch name; the app owns the classes. Storing a swatch
 * name rather than raw CSS means a tag can never be given an unreadable or
 * off-brand colour from the dashboard.
 */
export const TAG_COLORS = {
  gold: {
    label: "Gold",
    badge: "bg-[#D4AF37] text-[#06131D]",
    swatch: "#D4AF37",
  },
  red: {
    label: "Red",
    badge: "bg-[#C0392B] text-white",
    swatch: "#C0392B",
  },
  green: {
    label: "Green",
    badge: "bg-[#1D7A4C] text-white",
    swatch: "#1D7A4C",
  },
  blue: {
    label: "Blue",
    badge: "bg-[#2563A8] text-white",
    swatch: "#2563A8",
  },
  purple: {
    label: "Purple",
    badge: "bg-[#6B3FA0] text-white",
    swatch: "#6B3FA0",
  },
  teal: {
    label: "Teal",
    badge: "bg-[#0E7C7B] text-white",
    swatch: "#0E7C7B",
  },
  orange: {
    label: "Orange",
    badge: "bg-[#C2610F] text-white",
    swatch: "#C2610F",
  },
  obsidian: {
    label: "Obsidian",
    badge: "bg-[#06131D] text-[#F3E5AB]",
    swatch: "#06131D",
  },
} as const;

export type TagColor = keyof typeof TAG_COLORS;

export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS) as TagColor[];

export function tagBadgeClasses(color: string): string {
  return (TAG_COLORS[color as TagColor] ?? TAG_COLORS.gold).badge;
}

export function tagSwatch(color: string): string {
  return (TAG_COLORS[color as TagColor] ?? TAG_COLORS.gold).swatch;
}

/* -------------------------------------------------------------------------- */
/* Keys                                                                       */
/* -------------------------------------------------------------------------- */

/** Mirrors public.taxonomy_slugify in the database. */
export function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

export async function fetchTiers(
  supabase: SupabaseClient,
): Promise<PackageTierRecord[]> {
  const { data } = await supabase
    .from("package_tiers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data as PackageTierRecord[]) ?? [];
}

export async function fetchTags(
  supabase: SupabaseClient,
): Promise<PackageTagRecord[]> {
  const { data } = await supabase
    .from("package_tags")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  return (data as PackageTagRecord[]) ?? [];
}

/* -------------------------------------------------------------------------- */
/* Resolving keys for display                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turn the keys stored on a package into things worth rendering. Keys with no
 * matching registry row are dropped rather than shown raw — a deleted tag
 * should disappear from the site, not leak `best-seller` onto a card.
 */
export function resolveTags(
  keys: string[] | undefined,
  registry: PackageTagRecord[],
): PackageTagRecord[] {
  if (!keys?.length) return [];
  const byKey = new Map(registry.map((tag) => [tag.key, tag]));
  return keys
    .map((key) => byKey.get(key))
    .filter((tag): tag is PackageTagRecord => Boolean(tag))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * The cheapest tier a package actually offers, by registry order — this
 * replaces the old hardcoded `prices["Super Saver"]` lookup, which broke the
 * moment that tier was renamed.
 */
export function lowestTier(
  prices: Record<string, unknown>,
  registry: PackageTierRecord[],
): PackageTierRecord | undefined {
  const available = new Set(Object.keys(prices ?? {}));
  return registry.find(
    (tier) => available.has(tier.key) || available.has(tier.name),
  );
}

/**
 * Display name for a stored tier reference.
 *
 * Packages reach the detail page from two places: the CMS, where prices are
 * keyed by tier key (`super-saver`), and the static price files under
 * components/Prices, which still key by display name (`Super Saver`). This
 * accepts either, so neither source renders a raw slug at a pilgrim.
 */
export function tierName(
  keyOrName: string,
  registry: PackageTierRecord[],
): string {
  const match = registry.find(
    (tier) => tier.key === keyOrName || tier.name === keyOrName,
  );
  if (match) return match.name;

  // Unknown reference — de-slug it rather than showing "super-saver".
  return keyOrName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
