-- ============================================================================
-- Hotels per package, falling back to the tier.
--
-- 028 and 030 put hotel distance and name on the tier, on the reasoning that
-- the business places each tier in a known hotel. In practice the hotel moves
-- with the supplier and the month: two Deluxe packages a month apart can be
-- 500 m from the Haram in two different hotels. Editing the tier to suit one
-- package silently rewrote every other package in that tier.
--
-- So a package may now name its own hotels, per tier it is priced in:
--
--   tier_hotels = {
--     "deluxe": { "makkah_hotel": "Waha Deafah", "makkah_distance": "500 m",
--                 "madinah_hotel": "Marjaan International",
--                 "madinah_distance": "100 m" },
--     ...
--   }
--
-- Every field is optional and a blank one falls back to the tier's value
-- (withPackageHotels() in src/lib/taxonomy.ts), so the default '{}' renders
-- exactly what the site showed before this migration. Stars and highlights
-- stay tier-only — they describe the grade of a tier, not one hotel.
--
-- Rejected: moving the four columns off package_tiers. Every live package
-- would lose its hotels until re-entered, and a new package would start with
-- none instead of the tier's usual answer.
-- Rejected: a package_tier_hotels table. The hotel is a snapshot of what the
-- flyer said, read and written only with its package — jsonb on the row, like
-- `details`, is one read and one write with no join to keep consistent.
--
-- The checks bound what an attacker with an admin's session can store; the
-- shape inside the object is the app's to read defensively. Safe to run more
-- than once.
-- ============================================================================

alter table public.packages
  add column if not exists tier_hotels jsonb not null default '{}'::jsonb;

alter table public.packages
  drop constraint if exists packages_tier_hotels_shape;
alter table public.packages
  add constraint packages_tier_hotels_shape
  check (
    jsonb_typeof(tier_hotels) = 'object'
    and length(tier_hotels::text) <= 8000
  );
