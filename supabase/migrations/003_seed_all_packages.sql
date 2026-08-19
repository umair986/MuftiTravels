update public.packages
set prices = (
  select jsonb_object_agg(key, value - 'Child(6-11)' - 'Child(2-5)' - 'Infant(0-2)')
  from jsonb_each(prices)
)
where prices <> '{}'::jsonb;

insert into public.packages (slug, category, name, description, image_url, duration_days, duration_nights, destinations, features, prices, starting_price, currency, reviews, rating, is_published, sort_order)
values
(
  '15-days-regular-umrah-from-mumbai', 'Umrah Fixed Group', '15 Days Regular Umrah from Mumbai',
  'A guided fixed-group Umrah journey from Mumbai with direct flights, comfortable hotels near the Haram and special guided Ziyarat.',
  '/packages/umrah/umrah1.jpeg', 15, 14, 'Makkah and Madinah',
  array['Direct Flight from Mumbai', 'Deluxe Hotels near Haram', 'Special Guided Ziyarat'],
  '{"Super Saver":{"Quint":69786,"Quad":70786,"Triple":72786,"Double":76786},"Bronze":{"Quint":76786,"Quad":78786,"Triple":82786,"Double":90786},"Silver":{"Quint":82786,"Quad":86786,"Triple":92786,"Double":104786},"Gold":{"Quint":99786,"Quad":101786,"Triple":106786,"Double":119786}}'::jsonb,
  69786, 'INR', 45, 5, true, 10
),
(
  '15-days-regular-umrah-from-lucknow', 'Umrah Fixed Group', '15 Days Regular Umrah from Lucknow',
  'A guided fixed-group Umrah journey from Lucknow with direct flights, comfortable hotels near the Haram and special guided Ziyarat.',
  '/packages/umrah/umrah2.jpeg', 15, 14, 'Makkah and Madinah',
  array['Direct Flight from Lucknow', 'Deluxe Hotels near Haram', 'Special Guided Ziyarat'],
  '{"Super Saver":{"Quint":72786,"Quad":73786,"Triple":75786,"Double":79786},"Bronze":{"Quint":80786,"Quad":82786,"Triple":86786,"Double":94786},"Silver":{"Quint":87786,"Quad":91786,"Triple":97786,"Double":109786},"Gold":{"Quint":104786,"Quad":106786,"Triple":111786,"Double":124786}}'::jsonb,
  72786, 'INR', 28, 5, true, 11
),
(
  '15-days-regular-umrah-from-delhi', 'Umrah Fixed Group', '15 Days Regular Umrah from Delhi',
  'A guided fixed-group Umrah journey from Delhi with direct flights, comfortable hotels near the Haram and special guided Ziyarat.',
  '/packages/umrah/umrah4.jpg', 15, 14, 'Makkah and Madinah',
  array['Direct Flight from Delhi', 'Deluxe Hotels near Haram', 'Special Guided Ziyarat'],
  '{"Super Saver":{"Quint":72786,"Quad":73786,"Triple":75786,"Double":79786},"Bronze":{"Quint":80786,"Quad":82786,"Triple":86786,"Double":94786},"Silver":{"Quint":87786,"Quad":91786,"Triple":97786,"Double":109786},"Gold":{"Quint":104786,"Quad":106786,"Triple":111786,"Double":124786}}'::jsonb,
  72786, 'INR', 33, 5, true, 12
),
(
  '14-days-umrah-land-package', 'Umrah Land Package', '14 Days Umrah Land Package',
  'A comfortable Umrah land package with Makkah and Madinah hotel stays, ground transport and visa assistance.',
  '/packages/package1.webp', 14, 13, 'Makkah and Madinah',
  array['Makkah and Madinah Stay', 'Ground Transport', 'Visa Assistance', '24/7 Assistance'],
  '{"Silver":{"Quint":60786,"Quad":64786,"Triple":69786,"Double":74786},"Gold":{"Quint":70786,"Quad":74786,"Triple":79786,"Double":84786}}'::jsonb,
  60786, 'INR', 35, 5, true, 20
),
(
  '30-days-super-saver-land-package', 'Umrah Land Package', '30 Days Super Saver Land Package',
  'An extended Umrah land package with comfortable accommodation, ground transport and group Ziyarat.',
  '/packages/package2.webp', 30, 29, 'Makkah and Madinah',
  array['Extended Stay', 'Economy Hotels', 'Group Ziyarat'],
  '{"Super Saver":{"Quint":58786,"Quad":62786,"Triple":67786,"Double":72786}}'::jsonb,
  58786, 'INR', 28, 5, true, 21
),
(
  '25-days-super-saver-land-package', 'Umrah Land Package', '25 Days Super Saver Land Package',
  'A budget-friendly extended Umrah land package with accommodation, visa assistance and self-guided Ziyarat.',
  '/packages/package3.webp', 25, 24, 'Makkah and Madinah',
  array['Budget Accommodation', 'Self-guided Ziyarat', 'Visa Included'],
  '{"Super Saver":{"Quint":51786,"Quad":55786,"Triple":60786,"Double":65786}}'::jsonb,
  51786, 'INR', 25, 5, true, 22
),
(
  'umrah-plus-turkey', 'Ziyarat', 'Umrah Plus Turkey Heritage Tour',
  'Combine Umrah with a guided Turkey heritage journey across Istanbul and Bursa.',
  '/packages/package1.webp', 18, 17, 'Makkah, Madinah, Istanbul and Bursa',
  array['Umrah Visa', 'Turkey E-Visa', 'Bosphorus Cruise', '5-star Hotels'],
  '{"Platinum":{"Quint":226786,"Quad":230786,"Triple":235786,"Double":240786}}'::jsonb,
  226786, 'INR', 26, 5, true, 30
),
(
  'umrah-plus-dubai', 'Ziyarat', 'Umrah Plus Dubai Luxury City Break',
  'Combine Umrah with a Dubai city break featuring excursions, comfortable hotels and guided support.',
  '/packages/package2.webp', 16, 15, 'Makkah, Madinah and Dubai Marina',
  array['Umrah Visa', 'Dubai Visa', 'Desert Safari', '4-star and 5-star Hotels'],
  '{"Gold":{"Quint":145786,"Quad":149786,"Triple":154786,"Double":159786},"Platinum":{"Quint":171786,"Quad":175786,"Triple":180786,"Double":185786}}'::jsonb,
  145786, 'INR', 28, 5, true, 31
),
(
  'umrah-plus-baitul-muqaddas', 'Ziyarat', 'Umrah Plus Baitul Muqaddas (Al-Aqsa)',
  'A sacred journey combining Umrah with historical Ziyarat across Jerusalem and Jordan.',
  '/packages/package3.webp', 20, 19, 'Makkah, Madinah, Jerusalem and Jordan',
  array['Masjid Al-Aqsa Visit', 'Jordan Visa', 'Historical Ziyarat', 'VIP Transport'],
  '{"Platinum":{"Quint":171786,"Quad":175786,"Triple":180786,"Double":185786}}'::jsonb,
  171786, 'INR', 33, 5, true, 32
)
on conflict (slug) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  duration_days = excluded.duration_days,
  duration_nights = excluded.duration_nights,
  destinations = excluded.destinations,
  features = excluded.features,
  prices = excluded.prices,
  starting_price = excluded.starting_price,
  currency = excluded.currency,
  reviews = excluded.reviews,
  rating = excluded.rating,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order;
