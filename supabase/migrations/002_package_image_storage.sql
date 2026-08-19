insert into storage.buckets (id, name, public)
values ('package-images', 'package-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Package images are publicly readable" on storage.objects;
create policy "Package images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'package-images');

drop policy if exists "Authenticated users upload package images" on storage.objects;
create policy "Authenticated users upload package images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'package-images');

drop policy if exists "Authenticated users update package images" on storage.objects;
create policy "Authenticated users update package images"
on storage.objects for update
to authenticated
using (bucket_id = 'package-images')
with check (bucket_id = 'package-images');

drop policy if exists "Authenticated users delete package images" on storage.objects;
create policy "Authenticated users delete package images"
on storage.objects for delete
to authenticated
using (bucket_id = 'package-images');