-- ============================================================================
-- Photo gallery: collections and photos.
--
-- The home page gallery used to be a hardcoded array of four images in
-- src/app/components/GallerySection.tsx, pointing at /public/gallery/1..4.jpg.
-- Adding a photo, or a new place, meant a commit and a deploy. There was also
-- no /gallery route — a comment in that file records it was removed because it
-- 404'd.
--
-- A PHOTO belongs to a COLLECTION (Makkah, Madinah, a specific hotel, a
-- pilgrim group ...). Collections are what the dashboard creates and what
-- /gallery lists; photos are uploaded into a collection. `show_on_home`
-- and `home_sort_order` control the featured strip on the home page
-- independently of a collection's place in the full /gallery index
-- (`sort_order`), since a collection can be worth keeping public without
-- being one of the handful featured on the home page.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.gallery_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  location text not null default '',
  description text not null default '',
  cover_image_url text,
  is_published boolean not null default true,
  show_on_home boolean not null default false,
  sort_order integer not null default 100,
  home_sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.gallery_collections (id) on delete cascade,
  image_url text not null,
  -- The storage object path, so a delete can remove the file, not just the row.
  storage_path text not null default '',
  title text not null default '',
  caption text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists gallery_collections_sort_idx
on public.gallery_collections (sort_order);

create index if not exists gallery_collections_home_idx
on public.gallery_collections (show_on_home, home_sort_order);

create index if not exists gallery_photos_collection_idx
on public.gallery_photos (collection_id, sort_order);

-- ---------------------------------------------------------------------------
-- updated_at. Reuses the trigger function from migration 006.
-- ---------------------------------------------------------------------------
drop trigger if exists gallery_collections_updated_at on public.gallery_collections;
create trigger gallery_collections_updated_at
before update on public.gallery_collections
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists gallery_photos_updated_at on public.gallery_photos;
create trigger gallery_photos_updated_at
before update on public.gallery_photos
for each row execute function public.set_taxonomy_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: the public site renders published collections and their photos; only
-- admins write. A photo is public exactly when its parent collection is.
-- ---------------------------------------------------------------------------
alter table public.gallery_collections enable row level security;
alter table public.gallery_photos enable row level security;

drop policy if exists "Published collections are public" on public.gallery_collections;
create policy "Published collections are public"
on public.gallery_collections for select
to anon, authenticated
using (is_published);

drop policy if exists "Admins manage collections" on public.gallery_collections;
create policy "Admins manage collections"
on public.gallery_collections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Photos in published collections are public" on public.gallery_photos;
create policy "Photos in published collections are public"
on public.gallery_photos for select
to anon, authenticated
using (
  exists (
    select 1 from public.gallery_collections c
    where c.id = collection_id and c.is_published
  )
);

drop policy if exists "Admins manage photos" on public.gallery_photos;
create policy "Admins manage photos"
on public.gallery_photos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage — a public bucket, admin-only to change. Same shape as
-- package-images (migrations 002 + 008).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Gallery images are publicly readable" on storage.objects;
create policy "Gallery images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'gallery-images');

drop policy if exists "Admins upload gallery images" on storage.objects;
create policy "Admins upload gallery images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gallery-images' and public.is_admin());

drop policy if exists "Admins update gallery images" on storage.objects;
create policy "Admins update gallery images"
on storage.objects for update
to authenticated
using (bucket_id = 'gallery-images' and public.is_admin())
with check (bucket_id = 'gallery-images' and public.is_admin());

drop policy if exists "Admins delete gallery images" on storage.objects;
create policy "Admins delete gallery images"
on storage.objects for delete
to authenticated
using (bucket_id = 'gallery-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed with exactly the four photos that were hardcoded, so running this
-- migration changes nothing a visitor can see — the home page keeps showing
-- the same tiles, now from the database and editable from the dashboard.
-- ---------------------------------------------------------------------------
insert into public.gallery_collections (slug, title, location, description, cover_image_url, show_on_home, sort_order, home_sort_order)
values (
  'sacred-moments',
  'Sacred Moments & Holy Sites',
  'Makkah & Madinah',
  'Glimpses of the blessed journey — the Two Holy Mosques and historic Ziyarat landmarks experienced by our pilgrims.',
  '/gallery/1.jpg',
  true,
  10,
  10
)
on conflict (slug) do nothing;

insert into public.gallery_photos (collection_id, image_url, storage_path, title, caption, sort_order)
select c.id, v.image_url, '', v.title, v.caption, v.sort_order
from public.gallery_collections c
cross join (
  values
    ('/gallery/1.jpg', 'The Holy Kaaba at Dawn', 'Spiritual serenity during the early morning Tawaf.', 10),
    ('/gallery/2.jpg', 'Masjid An-Nabawi Courtyard', 'The peaceful marble courtyard and iconic umbrellas.', 20),
    ('/gallery/3.jpg', 'Historic Mount Uhud', 'Visiting the sacred grounds of the Battle of Uhud.', 30),
    ('/gallery/4.jpg', 'Pilgrim Group Reflections', 'Memorable brotherhood and sisterhood during guided Ziyarat.', 40)
) as v(image_url, title, caption, sort_order)
where c.slug = 'sacred-moments'
and not exists (
  select 1 from public.gallery_photos p
  where p.collection_id = c.id and p.image_url = v.image_url
);
