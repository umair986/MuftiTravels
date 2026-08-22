"use server";

import { revalidateTag } from "next/cache";
import { PACKAGES_CACHE_TAG } from "@/lib/packages.server";

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
