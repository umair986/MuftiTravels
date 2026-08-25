"use server";

import { revalidateTag } from "next/cache";
import { PACKAGES_CACHE_TAG } from "@/lib/packages.server";
import { GALLERY_CACHE_TAG } from "@/lib/gallery.server";

/**
 * Clears the cached public catalog.
 *
 * Called from the admin editor after a save so a change is visible on the site
 * immediately, rather than waiting out the cache window. Safe to expose: it
 * only discards a cache entry, and reveals nothing.
 */
export async function revalidatePackages(): Promise<void> {
  revalidateTag(PACKAGES_CACHE_TAG);
}

/** Same idea as revalidatePackages(), for the gallery's own cache tag. */
export async function revalidateGallery(): Promise<void> {
  revalidateTag(GALLERY_CACHE_TAG);
}
