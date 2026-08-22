import type { CategoryType } from "@/app/components/packageData";

/**
 * The one place that maps a package category to its URL segment.
 *
 * Every category the admin can create must appear here, or its packages 404 on
 * the public site while still being emitted into the sitemap. Keep this in step
 * with PACKAGE_CATEGORIES in lib/categoryFields.ts — the test in
 * tests/categories.test.ts asserts they match.
 */
export const CATEGORY_SLUGS: Record<CategoryType, string> = {
  "Umrah Fixed Group": "umrah-fixed-group",
  "Umrah Land Package": "umrah-land-package",
  Ziyarat: "ziyarat",
  Hajj: "hajj",
  Ramzan: "ramzan",
};

/** Reverse lookup used by the detail route to validate its [category] param. */
export const CATEGORY_BY_SLUG: Record<string, CategoryType> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([name, slug]) => [slug, name]),
) as Record<string, CategoryType>;

export function categorySlug(category: string): string {
  return (
    CATEGORY_SLUGS[category as CategoryType] ??
    category.toLowerCase().replaceAll(" ", "-")
  );
}

/** True when the public site can actually render this category. */
export function isRenderableCategory(category: string): boolean {
  return category in CATEGORY_SLUGS;
}
