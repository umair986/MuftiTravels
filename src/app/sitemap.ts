import type { MetadataRoute } from "next";
import { getPublicCatalog } from "@/lib/packages.server";
import { getGalleryIndex } from "@/lib/gallery.server";
import {
  CATEGORY_SLUGS,
  categorySlug,
  isRenderableCategory,
} from "@/lib/categories";
import { CITY_LANDING } from "@/lib/cityLanding";
import { GUIDES } from "@/lib/guides";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muftitravels.com";

/**
 * Every package URL comes from the published catalog — the admin is the only
 * source of packages, so anything published there is discoverable here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ packages }, galleryCollections] = await Promise.all([
    getPublicCatalog(),
    getGalleryIndex(),
  ]);

  // Only list what the detail route can render. Emitting a URL for a category
  // with no route feeds 404s to search engines.
  const packageUrls = packages
    .filter((pkg) => isRenderableCategory(pkg.category))
    .map((pkg) => ({
      url: `${siteUrl}/packages/${categorySlug(pkg.category)}/${pkg.slug}`,
      // The row's own timestamp, not "now". A sitemap that claims every page
      // changed at build time is one Google learns to discount.
      lastModified: new Date(pkg.updated_at ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // One entry per category landing page (/packages/hajj, /packages/ziyarat …).
  const categoryUrls = Object.values(CATEGORY_SLUGS).map((slug) => ({
    url: `${siteUrl}/packages/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Departure-city landing pages (/umrah-packages-from-mumbai …).
  const cityUrls = Object.values(CITY_LANDING).map((city) => ({
    url: `${siteUrl}${city.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Guides carry their own review date, which is the honest lastModified.
  const guideUrls = GUIDES.map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    lastModified: new Date(guide.reviewed),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const guidesIndexModified = GUIDES.map((guide) => guide.reviewed).sort().at(-1);

  const galleryUrls = galleryCollections.map((collection) => ({
    url: `${siteUrl}/gallery/${collection.slug}`,
    lastModified: new Date(collection.updated_at ?? Date.now()),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/packages`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...cityUrls,
    ...(GUIDES.length
      ? [
          {
            url: `${siteUrl}/guides`,
            lastModified: new Date(guidesIndexModified ?? Date.now()),
            changeFrequency: "monthly" as const,
            priority: 0.7,
          },
          ...guideUrls,
        ]
      : []),
    ...categoryUrls,
    ...packageUrls,
    ...galleryUrls,
  ];
}
