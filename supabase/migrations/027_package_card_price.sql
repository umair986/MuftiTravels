-- ============================================================================
-- Which price a package card shows.
--
-- A package carries a tier x sharing table (packages.prices, jsonb), but its
-- card on the website has room for one number. That number used to be "the
-- first sharing in the cheapest tier", and "first" meant jsonb key order —
-- which Postgres sorts by key length, not by price. So a card could show the
-- Double price while the Quad beside it in the same tier was cheaper.
--
-- Now the card shows the LOWEST price in the table, unless the admin has
-- picked a specific cell to lead with (the Gold Quad on a package sold on its
-- hotel, say). The two columns below hold that pick:
--
--   card_price_tier     a tier key from public.package_tiers ('silver'),
--                       exactly as it appears as a key of `prices`
--   card_price_sharing  the sharing label inside it ('Quad')
--
-- Both empty — the default, and every existing row — means "lowest".
--
-- Not enforced here: that the pair names a cell that exists. Prices are
-- edited after the pick is made, and a CHECK against the jsonb would turn
-- "remove the Gold row" into a save error. A pick that no longer matches a
-- priced cell falls back to the lowest price on the site instead
-- (cardPrice() in src/lib/packages.ts), which is the right answer anyway.
--
-- Two text columns rather than one jsonb: they default to '' so every reader
-- compares without a null check, the same convention as departure_city (026).
--
-- Safe to run more than once.
-- ============================================================================

alter table public.packages
  add column if not exists card_price_tier text not null default '';

alter table public.packages
  add column if not exists card_price_sharing text not null default '';

-- Bounded length only; the values are display data, not identifiers anything
-- joins on. An unbounded text column the public site renders is a column
-- someone eventually fills with a megabyte.
alter table public.packages
  drop constraint if exists packages_card_price_length;
alter table public.packages
  add constraint packages_card_price_length
  check (length(card_price_tier) <= 80 and length(card_price_sharing) <= 80);
