-- ============================================================================
-- Monthly packages, by departure city.
--
-- Umrah prices move every 15-30 days, and the airline and the hotels change
-- with them often enough that a month's offer is a different product from the
-- last one. So an Umrah package is now made FOR A MONTH and FROM A CITY:
--
--   "15 Days Umrah from Mumbai — November 2026"
--
-- and the site shows it only while that month lasts. The customer sees the
-- newest month first, on a city page whose address never changes
-- (/umrah-packages-from-mumbai), which is the link that gets shared, advertised
-- and ranked. The monthly package pages beneath it come and go.
--
-- The full design record, with the options rejected, is
-- docs/monthly-packages.md. The rules that live HERE, because the public site
-- reads packages straight from PostgREST and anything not enforced in Postgres
-- is not enforced at all:
--
--   1. A PACKAGE PAST ITS MONTH IS NOT PUBLIC. The select policy says so, not
--      the page. At midnight on 1 November, India time, October's packages stop
--      matching it — no job has to run, so no job can fail to run.
--
--   2. EXPIRED PACKAGES ARE NOT DELETED AUTOMATICALLY. The business asked for
--      this explicitly: the admin dashboard lists them and a person deletes
--      them. An automatic delete (pg_cron) was the first design and was
--      rejected — a package removed by a job is a package nobody looked at
--      first, and nothing here needs it gone for the site to be correct (rule
--      1 already hides it).
--
--   3. A DELETED PACKAGE'S LINK STILL LANDS SOMEWHERE. A WhatsApp forward of
--      October's package, opened in November, goes to that city's page rather
--      than a 404. The delete trigger remembers slug -> city for that.
--
-- Hajj and Ramadan packages leave valid_month null and never expire.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The two columns.
--
-- departure_city is a stable key ('mumbai', 'bangalore'), never a display
-- name, for the same reason tiers and tags are (migration 006): a rename is a
-- one-line change in src/lib/departures.ts rather than an UPDATE. The empty
-- string, not null, means "not city-specific" — a land package, a Ziyarat
-- combo — so every reader can compare without a null check.
--
-- The list of cities is NOT a CHECK here, only the key's shape. A city needs a
-- page (copy, airport, route file) before it is any use, and that is code; a
-- CHECK listing the six would make adding a seventh a migration as well as a
-- deploy, for no protection the admin's dropdown does not already give.
--
-- valid_month is a `date` pinned to the first of the month rather than text
-- like '2026-11': it sorts and compares as a date, and the CHECK makes
-- "the 15th of November" unrepresentable instead of something every reader
-- has to truncate.
-- ---------------------------------------------------------------------------
alter table public.packages
  add column if not exists departure_city text not null default '';

alter table public.packages
  add column if not exists valid_month date;

alter table public.packages
  drop constraint if exists packages_departure_city_format;
alter table public.packages
  add constraint packages_departure_city_format
  check (departure_city ~ '^[a-z]{0,40}$');

alter table public.packages
  drop constraint if exists packages_valid_month_first_day;
alter table public.packages
  add constraint packages_valid_month_first_day
  check (valid_month is null or extract(day from valid_month) = 1);

-- The city page's query: one city's packages, newest month first.
create index if not exists packages_city_month_idx
  on public.packages (departure_city, valid_month desc);

-- ---------------------------------------------------------------------------
-- This month, in India.
--
-- now() is UTC on Supabase. 1 November begins at 18:30 UTC on 31 October, and
-- a plain date_trunc('month', now()) would keep October's packages public for
-- the first five and a half hours of November in India. IST has no daylight
-- saving, so the zone name and a fixed +05:30 agree all year; the name is used
-- because it says what it means.
--
-- `stable`, not `immutable`: it reads the clock. currentIstMonth() in
-- src/lib/departures.ts mirrors it for code that already has rows in hand.
-- ---------------------------------------------------------------------------
create or replace function public.current_ist_month()
returns date
language sql
stable
as $$
  select date_trunc('month', now() at time zone 'Asia/Kolkata')::date;
$$;

revoke all on function public.current_ist_month() from public;
grant execute on function public.current_ist_month() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rule 1: the public sees published packages whose month is not over.
--
-- Replaces 001's policy of the same name. Admins are unaffected — "Admins
-- manage packages" (008) is a separate permissive policy, and they need to see
-- expired rows to delete them.
--
-- A package made early (November's, published on 20 October) is public at
-- once: the business wants no scheduling restriction, so >= rather than =.
-- ---------------------------------------------------------------------------
drop policy if exists "Published packages are public" on public.packages;
create policy "Published packages are public"
on public.packages for select
to anon, authenticated
using (
  is_published = true
  and (valid_month is null or valid_month >= public.current_ist_month())
);

-- ---------------------------------------------------------------------------
-- Rule 3: where a deleted package's link should go.
--
-- One row per deleted slug that belonged to a city. Written only by the
-- trigger below; nothing in the app inserts here. If a new package later takes
-- the same slug, the detail page finds the package first and this row is
-- simply never consulted.
--
-- No public policy: anonymous readers reach it only through
-- package_city_for_slug(), which returns a city key and nothing else.
-- ---------------------------------------------------------------------------
create table if not exists public.package_redirects (
  slug text primary key,
  departure_city text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.package_redirects enable row level security;

drop policy if exists "Admins manage package redirects" on public.package_redirects;
create policy "Admins manage package redirects"
on public.package_redirects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.remember_package_city()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.departure_city <> '' then
    insert into public.package_redirects (slug, departure_city)
    values (old.slug, old.departure_city)
    on conflict (slug) do update
      set departure_city = excluded.departure_city,
          created_at = timezone('utc', now());
  end if;
  return old;
end;
$$;

drop trigger if exists packages_remember_city on public.packages;
create trigger packages_remember_city
after delete on public.packages
for each row execute function public.remember_package_city();

-- ---------------------------------------------------------------------------
-- The one question the public may ask about a package it cannot see:
-- "which city did this belong to?"
--
-- Answers for a package that was published and has since expired, or one that
-- was deleted. NOT for a draft: a draft's slug is not public, and answering
-- for it would confirm that an unannounced package exists.
--
-- security definer because the caller is anonymous and the rows it reads are
-- exactly the ones the select policy hides from them. It returns a city key
-- or null — never a price, a name, or anything else on the row.
-- ---------------------------------------------------------------------------
create or replace function public.package_city_for_slug(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select departure_city
      from public.packages
      where slug = p_slug
        and departure_city <> ''
        and is_published = true
        and valid_month < public.current_ist_month()
    ),
    (
      select departure_city
      from public.package_redirects
      where slug = p_slug
    )
  );
$$;

revoke all on function public.package_city_for_slug(text) from public;
grant execute on function public.package_city_for_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing packages: file each under its city where the slug says which.
--
-- The three city pages before this migration found their package by the slug
-- `15-days-regular-umrah-from-<city>`, so every live city package already
-- names its city. Matched on whole hyphen-separated words, so "delhi" does
-- not match inside some longer word. Bengaluru is accepted for Bangalore.
--
-- valid_month is deliberately NOT backfilled. Nothing in a slug says which
-- month a package was priced for, and guessing would hide packages the moment
-- this runs. Existing packages stay undated — visible, never expiring — until
-- the admin sets their month.
-- ---------------------------------------------------------------------------
update public.packages as p
set departure_city = c.key
from (
  values
    ('mumbai', 'mumbai'),
    ('delhi', 'delhi'),
    ('lucknow', 'lucknow'),
    ('hyderabad', 'hyderabad'),
    ('bangalore', 'bangalore|bengaluru'),
    ('ahmedabad', 'ahmedabad')
) as c(key, pattern)
where p.departure_city = ''
  and p.slug ~ ('(^|-)(' || c.pattern || ')(-|$)');
