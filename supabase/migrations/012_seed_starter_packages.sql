-- ============================================================================
-- Starter packages for the Hajj and Ramzan categories.
--
-- Both categories exist in the admin, in the homepage tabs and now at their
-- own landing pages (/packages/hajj, /packages/ramzan) — but neither had a
-- single published row, so those pages had nothing to show and nothing for a
-- search engine to index.
--
-- These are STARTERS, not finished listings. Edit or delete them from
-- /admin/packages like any other package.
--
-- Deliberately seeded WITHOUT prices (`prices = '{}'`, `starting_price = 0`).
-- The site renders "On request" for those, which is true, where an invented
-- number would be a false price quoted to a pilgrim. Add the real prices in
-- the admin and the cards, the Product schema and the search result all start
-- showing them.
--
-- Safe to run more than once — `on conflict (slug) do nothing`.
-- ============================================================================

insert into public.packages (
  slug, category, name, description, image_url,
  duration_days, duration_nights, destinations, features,
  prices, starting_price, currency, reviews, rating,
  is_published, sort_order, card_tags, details
)
values
-- ---------------------------------------------------------------------------
-- Hajj
-- ---------------------------------------------------------------------------
(
  'shorter-hajj-package', 'Hajj', 'Shorter Hajj Package',
  'A shorter Hajj itinerary covering the days of Hajj with accommodation in Azizia and a Mina tent, for pilgrims who want the rites without an extended stay.',
  '/packages/umrah/umrah3.jpeg', 21, 20, 'Makkah, Mina, Arafat and Madinah',
  array['Mina Tent Accommodation', 'Azizia Stay', 'Qurbani Arranged', 'Guided Rites'],
  '{}'::jsonb, 0, 'INR', 0, 5,
  true, 30, array['new'],
  '{"package_type":"Shorter Hajj","mina_tent_category":"Category B","azizia_included":true,"qurbani_included":true}'::jsonb
),
(
  'longer-hajj-package', 'Hajj', 'Longer Hajj Package',
  'An extended Hajj journey with additional days in Makkah and Madinah around the rites, a higher Mina tent category and Mashaer train transfers.',
  '/packages/umrah/umrah1.jpeg', 35, 34, 'Makkah, Mina, Arafat and Madinah',
  array['Category A Mina Tent', 'Mashaer Train', 'Extended Madinah Stay', 'Qurbani Arranged'],
  '{}'::jsonb, 0, 'INR', 0, 5,
  true, 31, array['new'],
  '{"package_type":"Longer Hajj","mina_tent_category":"Category A","azizia_included":true,"mashaer_train":true,"qurbani_included":true}'::jsonb
),

-- ---------------------------------------------------------------------------
-- Ramzan
-- ---------------------------------------------------------------------------
(
  'last-ashra-ramadan-umrah', 'Ramzan', 'Last Ashra Ramadan Umrah',
  'Umrah across the final ten nights of Ramadan, covering the odd nights on which Laylatul Qadr is sought, with suhoor and iftar included.',
  '/packages/umrah/umrah2.jpeg', 12, 11, 'Makkah and Madinah',
  array['Last Ten Nights', 'Suhoor & Iftar Included', 'Hotels near the Haram', 'Guided Ziyarat'],
  '{}'::jsonb, 0, 'INR', 0, 5,
  true, 40, array['new'],
  '{"portion":"Last Ashra","laylatul_qadr_nights":["21st","23rd","25th","27th","29th"],"suhoor_iftar_included":true,"itikaf_arranged":true}'::jsonb
),
(
  'first-ashra-ramadan-umrah', 'Ramzan', 'First Ashra Ramadan Umrah',
  'Umrah in the opening ten days of Ramadan — a calmer Haram, easier hotel availability and a lower cost than the final ashra.',
  '/packages/umrah/umrah4.jpg', 12, 11, 'Makkah and Madinah',
  array['First Ten Days', 'Suhoor & Iftar Included', 'Quieter Haram', 'Guided Ziyarat'],
  '{}'::jsonb, 0, 'INR', 0, 5,
  true, 41, '{}',
  '{"portion":"First Ashra","suhoor_iftar_included":true,"itikaf_arranged":false}'::jsonb
),
(
  'full-month-ramadan-umrah', 'Ramzan', 'Full Month Ramadan Umrah',
  'The complete month in the Haramain, from the first taraweeh to Eid, with Itikaf arrangements across the final ten nights.',
  '/packages/package2.webp', 32, 31, 'Makkah and Madinah',
  array['Complete Month', 'Itikaf Arranged', 'Suhoor & Iftar Included', 'Eid in the Haram'],
  '{}'::jsonb, 0, 'INR', 0, 5,
  true, 42, '{}',
  '{"portion":"Full Month","laylatul_qadr_nights":["21st","23rd","25th","27th","29th"],"suhoor_iftar_included":true,"itikaf_arranged":true}'::jsonb
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- The 'new' card tag the rows above reference, in case the registry does not
-- have it yet. Matches the shape seeded by migration 006.
-- ---------------------------------------------------------------------------
insert into public.package_tags (key, label, color, sort_order)
values ('new', 'New', 'blue', 100)
on conflict (key) do nothing;
