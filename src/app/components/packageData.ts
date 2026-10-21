/**
 * Shared package display types.
 *
 * This file used to hold hardcoded packages as well. Every package now comes
 * from the admin dashboard (the `packages` table) — nothing on the public site
 * is priced from code — so only the shapes remain. `cmsPackageToPackageData`
 * in lib/packages.ts turns a CMS record into `PackageData` for the detail page.
 */

import type { PackageTierHotels } from "@/lib/taxonomy";

export interface Badge {
  text: string;
  color: string;
}

export type CategoryType =
  | "Umrah Fixed Group"
  | "Umrah Land Package"
  | "Ziyarat"
  | "Hajj"
  | "Ramzan";

export type PackageTier = "Super Saver" | "Bronze" | "Silver" | "Gold" | "Platinum";
export type SharingType = string;
export type PriceMap = {
  [key: string]: number | undefined;
};

export type TierPriceMap = {
  [key in PackageTier]?: PriceMap;
};

export interface PackageData {
  name: string;
  image: string;
  reviews: number;
  rating: 1 | 2 | 3 | 4 | 5;
  features: string[];
  badges: Badge[];
  card_tags?: string[];
  slug: string;
  prices: TierPriceMap;
  /** The cell the card shows, so the detail page opens on the same price. */
  defaultPrice?: { tier: string; sharing: string };
  durationDays?: number;
  durationNights?: number;
  /** From the package's details; 0 when the admin has not filled it in. */
  makkahNights?: number;
  madinahNights?: number;
  /** Migration 032: this package's hotels per tier, over the tier's own. */
  tierHotels?: PackageTierHotels;
}
