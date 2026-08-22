import type { MetadataRoute } from "next";
import { getPublicCatalog } from "@/lib/packages.server";
import { categorySlug, isRenderableCategory } from "@/lib/categories";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muftitravels.com";

/**
 * The sitemap used to list only the hardcoded packages in components/
 * packageData.ts, so nothing created through the admin was ever discoverable.
 * It now reads the published catalog, with the static fixed-group city pages
 * added because those are separate routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { packages } = await getPublicCatalog();

  // Only list what the detail route can render. Emitting a URL for a category
  // with no route feeds 404s to search engines.
  const packageUrls = packages
    .filter((pkg) => isRenderableCategory(pkg.category))
    .map((pkg) => ({
      url: `${siteUrl}/packages/${categorySlug(pkg.category)}/${pkg.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const fixedGroupUrls = ["delhi", "lucknow", "mumbai"].map((city) => ({
    url: `${siteUrl}/packages/umrah-fixed-group/${city}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
    ...packageUrls,
    ...fixedGroupUrls,
  ];
}
