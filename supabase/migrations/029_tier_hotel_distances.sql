-- ============================================================================
-- Each tier's hotel distances, as the business's flyer states them.
--
-- The flyers write a tier's distances as "(Makkah + Madinah)": "(1500 + 900)"
-- is 1,500 m from the Haram and 900 m from Masjid an-Nabawi — one distance per
-- city, not a range. Migration 028 misread Super Saver's as '1,300–1,500 m',
-- and seeded only Super Saver and Gold. The business confirmed all four from
-- the Ex-Mumbai Nov–Dec 2026 flyer:
--
--   Super Saver (shown as "Budget")  1,500 m   900 m
--   Bronze                             600 m   400 m
--   Silver                             500 m   100 m   flyer printed "500 - 100";
--                                                     the "-" is a typo for "+"
--   Gold                               300 m     0 m   was 100 m in 028's seed
--
-- Set outright rather than only-where-blank: these are confirmed figures that
-- replace what 028 guessed. Running it again sets the same values, so it is
-- safe to repeat — but it would undo a later edit made in Tags & Tiers, so do
-- not re-run it after the business has changed a distance there.
-- ============================================================================

update public.package_tiers as t
set makkah_distance = v.makkah, madinah_distance = v.madinah
from (
  values
    ('super-saver', '1,500 m', '900 m'),
    ('bronze', '600 m', '400 m'),
    ('silver', '500 m', '100 m'),
    ('gold', '300 m', '0 m')
) as v(key, makkah, madinah)
where t.key = v.key;
