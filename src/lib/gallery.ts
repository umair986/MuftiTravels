/**
 * Photo gallery — collections and the photos inside them.
 *
 * A collection is a place or theme (Makkah, Madinah, a specific hotel, a
 * pilgrim group ...) shown at /gallery and /gallery/[slug]. Some collections
 * are also featured on the home page, independent of their place in the full
 * index — see `show_on_home` / `home_sort_order` below.
 */

import { slugifyContentKey } from "@/lib/siteContent";

export type GalleryPhoto = {
  id: string;
  collection_id: string;
  image_url: string;
  storage_path: string;
  title: string;
  caption: string;
  sort_order: number;
};

export type GalleryCollection = {
  id: string;
  slug: string;
  title: string;
  location: string;
  description: string;
  cover_image_url: string | null;
  is_published: boolean;
  show_on_home: boolean;
  sort_order: number;
  home_sort_order: number;
  updated_at: string;
};

export type GalleryCollectionWithCount = GalleryCollection & {
  photo_count: number;
};

export type GalleryCollectionWithPhotos = GalleryCollection & {
  photos: GalleryPhoto[];
};

/** Mirrors public.taxonomy_slugify — same rule already used for content keys. */
export const slugifyGallery = slugifyContentKey;

/**
 * The four photos that used to be hardcoded in GallerySection.tsx, as a
 * fallback for the home page. Used only if Supabase is unreachable or the
 * table is empty (migration 013 seeds this same data, so that should not
 * happen once it has run).
 */
export const DEFAULT_HOME_COLLECTIONS: GalleryCollectionWithCount[] = [
  {
    id: "default-sacred-moments",
    slug: "sacred-moments",
    title: "Sacred Moments & Holy Sites",
    location: "Makkah & Madinah",
    description:
      "Glimpses of the blessed journey — the Two Holy Mosques and historic Ziyarat landmarks experienced by our pilgrims.",
    cover_image_url: "/gallery/1.jpg",
    is_published: true,
    show_on_home: true,
    sort_order: 10,
    home_sort_order: 10,
    updated_at: new Date(0).toISOString(),
    photo_count: 4,
  },
];

/** "masjid-nabawi-dawn.jpg" -> "Masjid Nabawi Dawn", used to pre-fill a name on upload. */
export function photoTitleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./]+$/, "");
  return withoutExtension
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Storage object path for a newly uploaded photo, namespaced by uploader and collection. */
export function galleryStoragePath(
  userId: string,
  collectionSlug: string,
  file: File,
): string {
  const extension = file.name.split(".").pop() || "jpg";
  return `${userId}/${collectionSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}
