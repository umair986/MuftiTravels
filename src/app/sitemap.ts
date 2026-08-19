import type { MetadataRoute } from "next";
import { packageData } from "./components/packageData";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muftitravels.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const packageUrls = Object.entries(packageData).flatMap(([category, packages]) => {
    const categorySlug = category.toLowerCase().replaceAll(" ", "-");

    return packages.map((pkg) => ({
      url: `${siteUrl}/packages/${categorySlug}/${pkg.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  });

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
    ...packageUrls,
    ...fixedGroupUrls,
  ];
}