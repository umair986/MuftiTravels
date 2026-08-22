import "server-only";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { CmsPackageRecord } from "@/lib/packages";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";
import type { SiteContentList } from "@/lib/siteContent";

/**
 * Server-side reads for published package content.
 *
 * These replace the per-component `useEffect` fetches the cards used to do.
 * Fetching here means package names and prices are in the server HTML (so they
 * are indexable), the registries are read once per render rather than once per
 * card, and the result is cached and shared across visitors instead of every
 * browser hitting Supabase directly.
 *
 * Call `revalidatePackages()` from src/lib/revalidate.ts after an admin save to
 * clear these.
 */

export const PACKAGES_CACHE_TAG = "packages";

/** An hour is a safe ceiling; admin saves clear the tag immediately anyway. */
const CACHE_SECONDS = 3600;

export type PublicCatalog = {
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
  /** Inclusions, policies and notes, shared by every package page. */
  content: SiteContentList[];
  /** False when Supabase is unreachable or unconfigured. */
  isAvailable: boolean;
};

const emptyCatalog: PublicCatalog = {
  packages: [],
  tiers: [],
  tags: [],
  content: [],
  isAvailable: false,
};

async function loadCatalog(): Promise<PublicCatalog> {
  const supabase = createServerClient();
  if (!supabase) return emptyCatalog;

  const [packagesResult, tiersResult, tagsResult, contentResult] =
    await Promise.all([
      supabase
        .from("packages")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("package_tiers")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("package_tags")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("site_content_lists")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

  // A missing tier/tag registry is survivable — cards fall back to plain
  // labels. Missing content is survivable too: the detail page falls back to
  // DEFAULT_CONTENT_LISTS, which is what ships before migration 011 is run.
  // A failed package read is not, and must not be cached as "empty".
  if (packagesResult.error) return emptyCatalog;

  return {
    packages: (packagesResult.data as CmsPackageRecord[]) ?? [],
    tiers: (tiersResult.data as PackageTierRecord[]) ?? [],
    tags: (tagsResult.data as PackageTagRecord[]) ?? [],
    content: (contentResult.data as SiteContentList[]) ?? [],
    isAvailable: true,
  };
}

const loadCatalogCached = unstable_cache(loadCatalog, ["public-catalog"], {
  tags: [PACKAGES_CACHE_TAG],
  revalidate: CACHE_SECONDS,
});

/** Every published package, plus the tier and tag registries. */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  const catalog = await loadCatalogCached();
  // Never cache a failed read: retry on the next request instead of serving an
  // empty catalog for an hour.
  return catalog.isAvailable ? catalog : loadCatalog();
}

/** Published packages in one category, with the registries alongside. */
export async function getCategoryCatalog(
  category: string,
): Promise<PublicCatalog> {
  const catalog = await getPublicCatalog();
  return {
    ...catalog,
    packages: catalog.packages.filter((item) => item.category === category),
  };
}
