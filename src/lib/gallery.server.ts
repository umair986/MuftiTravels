import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOME_COLLECTIONS,
  type GalleryCollection,
  type GalleryCollectionWithCount,
  type GalleryCollectionWithPhotos,
  type GalleryPhoto,
} from "@/lib/gallery";

/**
 * Server-side reads for the public gallery, mirroring src/lib/packages.server.ts:
 * cached, tagged, and cleared by an admin save via revalidateGallery().
 */

export const GALLERY_CACHE_TAG = "gallery";
const CACHE_SECONDS = 3600;

type CollectionRow = GalleryCollection & { gallery_photos: { count: number }[] };

async function loadGalleryIndex(): Promise<{
  collections: GalleryCollectionWithCount[];
  isAvailable: boolean;
}> {
  const supabase = createServerClient();
  if (!supabase) return { collections: [], isAvailable: false };

  const { data, error } = await supabase
    .from("gallery_collections")
    .select("*, gallery_photos(count)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) return { collections: [], isAvailable: false };

  const collections = ((data as CollectionRow[]) ?? []).map((row) => {
    const { gallery_photos, ...collection } = row;
    return { ...collection, photo_count: gallery_photos?.[0]?.count ?? 0 };
  });

  return { collections, isAvailable: true };
}

/**
 * Throwing on an unavailable read keeps the failure out of the cache — a
 * resolved-but-empty result would otherwise sit there for the full hour, so a
 * transient outage degrades the site for as long as a real one would.
 */
const loadGalleryIndexCached = unstable_cache(
  async () => {
    const result = await loadGalleryIndex();
    if (!result.isAvailable) throw new Error("gallery index unavailable");
    return result;
  },
  ["gallery-index"],
  { tags: [GALLERY_CACHE_TAG], revalidate: CACHE_SECONDS },
);

async function resolveIndex(): Promise<{
  collections: GalleryCollectionWithCount[];
  isAvailable: boolean;
}> {
  try {
    return await loadGalleryIndexCached();
  } catch {
    return loadGalleryIndex();
  }
}

/** Every published collection, with its photo count, ordered for /gallery. */
export async function getGalleryIndex(): Promise<GalleryCollectionWithCount[]> {
  const { collections } = await resolveIndex();
  return collections;
}

/** Published collections flagged for the home page, ordered separately from /gallery. */
export async function getHomeCollections(): Promise<GalleryCollectionWithCount[]> {
  const { collections, isAvailable } = await resolveIndex();
  // The fallback covers an unreachable database, not an empty selection — an
  // admin who unticks every collection means the home strip to be empty, and
  // GallerySection already renders nothing for an empty list.
  if (!isAvailable) return DEFAULT_HOME_COLLECTIONS;
  return collections
    .filter((collection) => collection.show_on_home)
    .sort((a, b) => a.home_sort_order - b.home_sort_order);
}

async function loadCollection(
  slug: string,
): Promise<GalleryCollectionWithPhotos | null> {
  const supabase = createServerClient();
  if (!supabase) return null;

  const { data: collection, error: collectionError } = await supabase
    .from("gallery_collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (collectionError || !collection) return null;

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("collection_id", collection.id)
    .order("sort_order", { ascending: true });

  return {
    ...(collection as GalleryCollection),
    photos: (photos as GalleryPhoto[]) ?? [],
  };
}

/**
 * One published collection and its photos, or null if it doesn't exist / isn't
 * published. Tagged so an admin save reaches this prerendered route — without a
 * tag, /gallery/[slug] never picked up revalidateGallery() and froze at build
 * time. `cache()` on top dedupes generateMetadata and the page render into one
 * round-trip pair per request.
 */
export const getGalleryCollection = cache(
  async (slug: string): Promise<GalleryCollectionWithPhotos | null> =>
    unstable_cache(() => loadCollection(slug), ["gallery-collection", slug], {
      tags: [GALLERY_CACHE_TAG],
      revalidate: CACHE_SECONDS,
    })(),
);
