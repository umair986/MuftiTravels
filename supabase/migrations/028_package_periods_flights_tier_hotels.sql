-- ============================================================================
-- Rates for a run of months, flight details, and what each tier's hotels are.
--
-- Three additions that sell a departure on the city and package pages:
--
--   1. PACKAGES MAY COVER MORE THAN ONE MONTH. Sometimes only November's rates
--      are fixed; sometimes November and December are fixed together, and then
--      there is no separate November package. Migration 026 assumed one month
--      per package. valid_until_month records the last month the rates cover,
--      and the package now leaves the site when THAT month ends.
--
--   2. FLIGHTS. The departure dates and the airline, per package — packages
--      are per city (026), and each city flies on its own dates and carrier.
--
--   3. TIER HOTELS. How far a tier's hotels are from the Haram in Makkah and
--      from Masjid an-Nabawi in Madinah, their star rating, and a few lines
--      of selling points, shown as one tab per tier on every package page.
--      This is the main thing that separates one tier from another,
--      and it belongs to the tier, not to each package: the
--      business places every tier's hotels in a known band of distance.
--
-- The design record is docs/monthly-packages.md, decisions 11-13. Safe to run
-- more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. valid_until_month
--
-- A second date, not a month count or a daterange. A count would make every
-- reader do month arithmetic in SQL and in TypeScript; a daterange would turn
-- 026's plain `valid_month >= current month` into range operators that the
-- app's PostgREST filters and the admin's month inputs would both have to
-- learn. Two `YYYY-MM-01` dates compare the way they read.
--
-- Null means "the one month in valid_month", so every existing row keeps its
-- meaning without a backfill. It may only be set on a dated package, only to
-- the first of a month, and never before valid_month — an end equal to the
-- start is allowed and reads the same as null.
-- ---------------------------------------------------------------------------
alter table public.packages
  add column if not exists valid_until_month date;

alter table public.packages
  drop constraint if exists packages_valid_until_month_shape;
alter table public.packages
  add constraint packages_valid_until_month_shape
  check (
    valid_until_month is null
    or (
      valid_month is not null
      and extract(day from valid_until_month) = 1
      and valid_until_month >= valid_month
    )
  );

-- The select policy from 026, now on the LAST month covered. November-December
-- rates stay public through December. Admins are unaffected, as before.
drop policy if exists "Published packages are public" on public.packages;
create policy "Published packages are public"
on public.packages for select
to anon, authenticated
using (
  is_published = true
  and (
    valid_month is null
    or coalesce(valid_until_month, valid_month) >= public.current_ist_month()
  )
);

-- 026's redirect lookup answers for a package that has expired. "Expired"
-- now means its last month is over, or the link to a November-December
-- package would redirect away from a live page in December.
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
        and coalesce(valid_until_month, valid_month) < public.current_ist_month()
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
-- 2. Flights
--
-- departure_dates is a date[] rather than text: the site sorts and groups the
-- dates by month ("5, 19 Nov · 3 Dec"), and a date column means a typo is a
-- save error, not a garbled line on the page. Capped at 31 — one a day is
-- already more departures than any city has.
--
-- The airline is free text (carriers change, and "Saudia / flynas" is a real
-- answer). Whether the flight is direct is a separate, closed choice, because
-- the business must not claim a direct flight it has not confirmed — so the
-- default is '' (say nothing), not 'direct'. flight_via names the stop when
-- there is one; anything more detailed goes in the package description.
-- ---------------------------------------------------------------------------
alter table public.packages
  add column if not exists departure_dates date[] not null default '{}';

alter table public.packages
  add column if not exists airline text not null default '';

alter table public.packages
  add column if not exists flight_routing text not null default '';

alter table public.packages
  add column if not exists flight_via text not null default '';

alter table public.packages
  drop constraint if exists packages_flight_shape;
alter table public.packages
  add constraint packages_flight_shape
  check (
    coalesce(array_length(departure_dates, 1), 0) <= 31
    and length(airline) <= 80
    and flight_routing in ('', 'direct', 'via')
    and length(flight_via) <= 80
  );

-- ---------------------------------------------------------------------------
-- 3. Tier hotels
--
-- Distances are text, not metres in an integer: the honest answer for a tier
-- is often a band ("1,300-1,500 m"), and the business writes it the way the
-- customer should read it. hotel_stars is 0 for "do not show". highlights are
-- short selling lines, one per array element, shown in the tier's tab on a
-- package page. is_recommended marks the tier those tabs badge and nudge the
-- customer towards — Gold today.
--
-- The tiers table is admin-writable already (006, tightened to admins in 008); these
-- columns inherit those policies, and the public reads them as it reads tier
-- names.
-- ---------------------------------------------------------------------------
alter table public.package_tiers
  add column if not exists makkah_distance text not null default '';

alter table public.package_tiers
  add column if not exists madinah_distance text not null default '';

alter table public.package_tiers
  add column if not exists hotel_stars smallint not null default 0;

alter table public.package_tiers
  add column if not exists highlights text[] not null default '{}';

alter table public.package_tiers
  add column if not exists is_recommended boolean not null default false;

alter table public.package_tiers
  drop constraint if exists package_tiers_hotel_shape;
alter table public.package_tiers
  add constraint package_tiers_hotel_shape
  check (
    hotel_stars between 0 and 5
    and length(makkah_distance) <= 40
    and length(madinah_distance) <= 40
    and coalesce(array_length(highlights, 1), 0) <= 8
  );

-- The distances the business gave for its two best-known tiers. Only filled
-- where still blank, so re-running this never undoes an edit made in the
-- dashboard. Other tiers stay blank until the business fills them in.
update public.package_tiers
set makkah_distance = '300 m', madinah_distance = '100 m'
where key = 'gold' and makkah_distance = '' and madinah_distance = '';

update public.package_tiers
set makkah_distance = '1,300–1,500 m', madinah_distance = '900 m'
where key = 'super-saver' and makkah_distance = '' and madinah_distance = '';

-- Gold's selling points, as starting copy for the comparison — written here
-- rather than hard-coded in the page so the business can reword them in Tags &
-- Tiers. Each follows from the distance; none names a hotel or a time.
update public.package_tiers
set highlights = array[
  'Walk to all five daily prayers in the Haram',
  'More of your days in worship, less of them on the road',
  'Easier for parents, elders and anyone who tires on long walks',
  'Closer hotels carry higher star ratings'
]
where key = 'gold' and highlights = '{}';

-- Gold is the recommended tier, unless one has already been chosen.
update public.package_tiers
set is_recommended = true
where key = 'gold'
  and not exists (select 1 from public.package_tiers where is_recommended);
