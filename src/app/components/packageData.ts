/**
 * Shared package display types.
 *
 * This file used to hold hardcoded packages as well. Every package now comes
 * from the admin dashboard (the `packages` table) — nothing on the public site
 * is priced from code — so only the shapes remain. `cmsPackageToPackageData`
 * in lib/packages.ts turns a CMS record into `PackageData` for the detail page.
 */

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
}
