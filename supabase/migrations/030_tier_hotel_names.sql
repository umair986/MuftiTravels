-- ============================================================================
-- Hotel names on a tier — optional.
--
-- The business has tie-ups with particular hotels, and naming one ("Swissotel
-- Makkah, 300 m") sells a tier better than the distance alone. Optional,
-- because not every tier has a fixed hotel: the default '' means the package
-- page shows the distance and says nothing about a name.
--
-- On the tier, beside the distances from 028 and for the same reason: the
-- business places each tier in a known hotel, edited once in Tags & Tiers.
-- Free text, bounded like the distances. Safe to run more than once.
-- ============================================================================

alter table public.package_tiers
  add column if not exists makkah_hotel text not null default '';

alter table public.package_tiers
  add column if not exists madinah_hotel text not null default '';

alter table public.package_tiers
  drop constraint if exists package_tiers_hotel_names_length;
alter table public.package_tiers
  add constraint package_tiers_hotel_names_length
  check (length(makkah_hotel) <= 120 and length(madinah_hotel) <= 120);
