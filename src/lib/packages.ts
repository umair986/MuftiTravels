import { PackageData, TierPriceMap } from "@/app/components/packageData";
import type { PackageDetails } from "@/lib/categoryFields";

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
};

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
  };
}
