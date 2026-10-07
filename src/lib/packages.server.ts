import "server-only";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { CmsPackageRecord } from "@/lib/packages";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";
import type { SiteContentList } from "@/lib/siteContent";
import { isCityKey, isMonthExpired, type CityKey } from "@/lib/departures";

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

/**
 * Throwing on an unavailable read keeps the failure out of the cache —
 * unstable_cache only stores a resolved value, so a rejected promise here
 * means a transient outage retries on the next request instead of serving an
 * empty catalog for the full hour.
 */
const loadCatalogCached = unstable_cache(
  async () => {
    const catalog = await loadCatalog();
    if (!catalog.isAvailable) throw new Error("package catalog unavailable");
    return catalog;
  },
  ["public-catalog"],
  { tags: [PACKAGES_CACHE_TAG], revalidate: CACHE_SECONDS },
);

/** Every published package, plus the tier and tag registries. */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  let catalog: PublicCatalog;
  try {
    catalog = await loadCatalogCached();
  } catch {
    catalog = await loadCatalog();
  }
  return withoutExpired(catalog);
}

/**
 * Drop packages whose month is over — AFTER the data cache, not inside it.
 *
 * The select policy (migration 026) already hides them from every fresh read,
 * but the data cache holds a read for up to an hour; filtering what comes out
 * of it means any page rendered after midnight IST leaves October out.
 *
 * It does not make midnight exact on its own. The home and city pages are
 * statically rendered and revalidated hourly (ISR), so an expired package can
 * stay on an already-rendered page for up to an hour into the new month. That
 * was judged acceptable — see docs/monthly-packages.md — and nothing here
 * should be read as promising otherwise.
 */
function withoutExpired(catalog: PublicCatalog): PublicCatalog {
  const now = new Date();
  const packages = catalog.packages.filter(
    (item) => !isMonthExpired(item.valid_month, now),
  );
  return packages.length === catalog.packages.length
    ? catalog
    : { ...catalog, packages };
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

/**
 * The city a package belonged to, for a package the public can no longer see
 * — its month is over, or it has been deleted. Null for anything else,
 * including a draft (migration 026, package_city_for_slug).
 *
 * Only asked on a miss, so it is not cached: a missing package is rare, and a
 * cached "no city" would outlive the package being deleted.
 */
export async function getRetiredPackageCity(
  slug: string,
): Promise<CityKey | null> {
  const supabase = createServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("package_city_for_slug", {
    p_slug: slug,
  });
  if (error) return null;
  return isCityKey(data) ? data : null;
}
