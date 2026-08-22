-- ============================================================================
-- Admin roles.
--
-- Every policy written before this migration granted full access to the
-- `authenticated` role, which means "holds any valid JWT" — not "is an admin".
-- With public signup enabled, anyone could create an account and gain write
-- access to packages and read access to every customer enquiry.
--
-- This introduces an explicit admin list and re-points every policy at it.
--
-- IMPORTANT — bootstrapping: every user that exists at the moment this runs is
-- copied into admin_users, because today they already have full access. This
-- migration therefore takes nothing away from anyone who can already sign in;
-- it stops any NEW account from gaining access. Prune the table afterwards:
--
--   select * from public.admin_users;
--   delete from public.admin_users where email <> 'you@example.com';
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

-- Seed from the users who already hold access, so nobody is locked out.
insert into public.admin_users (user_id, email)
select id, coalesce(email, '')
from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- The predicate every policy below uses.
--
-- SECURITY DEFINER so the lookup itself is not subject to RLS on admin_users,
-- which would otherwise recurse. search_path is pinned per Supabase guidance.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- admin_users itself: a signed-in user may check their own row and nothing
-- else. Granting or revoking admin is deliberately not possible from the app —
-- it requires the SQL editor or the service role.
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;

drop policy if exists "Users can read their own admin row" on public.admin_users;
create policy "Users can read their own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- packages — public reads published rows; only admins write.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users manage packages" on public.packages;
drop policy if exists "Admins manage packages" on public.packages;
create policy "Admins manage packages"
on public.packages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- enquiries — anyone may submit; only admins may read or change.
-- This is the one that was exposing customer names, phones and emails.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users manage enquiries" on public.enquiries;
drop policy if exists "Admins manage enquiries" on public.enquiries;
create policy "Admins manage enquiries"
on public.enquiries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- tier and tag registries
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users manage tiers" on public.package_tiers;
drop policy if exists "Admins manage tiers" on public.package_tiers;
create policy "Admins manage tiers"
on public.package_tiers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users manage tags" on public.package_tags;
drop policy if exists "Admins manage tags" on public.package_tags;
create policy "Admins manage tags"
on public.package_tags for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- storage — package images stay publicly readable, admin-only to change.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users upload package images" on storage.objects;
drop policy if exists "Admins upload package images" on storage.objects;
create policy "Admins upload package images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'package-images' and public.is_admin());

drop policy if exists "Authenticated users update package images" on storage.objects;
drop policy if exists "Admins update package images" on storage.objects;
create policy "Admins update package images"
on storage.objects for update
to authenticated
using (bucket_id = 'package-images' and public.is_admin())
with check (bucket_id = 'package-images' and public.is_admin());

drop policy if exists "Authenticated users delete package images" on storage.objects;
drop policy if exists "Admins delete package images" on storage.objects;
create policy "Admins delete package images"
on storage.objects for delete
to authenticated
using (bucket_id = 'package-images' and public.is_admin());
