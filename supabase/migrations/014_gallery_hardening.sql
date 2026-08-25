-- ============================================================================
-- Gallery hardening, following the 013_gallery.sql audit.
--
-- 1. The 8 MB / image-only upload rule in AdminGalleryPage.tsx was enforced
--    only in the browser — the bucket accepted any file of any size from any
--    authenticated admin. This makes the rule real at the storage layer.
--
-- 2. gallery_collections_home_idx is never queried: the home page reads the
--    full published index (already cached and tagged) and filters/sorts
--    show_on_home in JavaScript, deliberately, so the same cache entry serves
--    both /gallery and the home page. Dropping dead weight, not fixing a bug.
--
-- Safe to run more than once.
-- ============================================================================

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'gallery-images';

drop index if exists public.gallery_collections_home_idx;
