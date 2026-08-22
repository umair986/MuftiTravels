-- ============================================================================
-- Site content lists.
--
-- Inclusions, exclusions, payment and cancellation policy, travel notes and
-- required documents lived in src/app/components/policyData.ts — a hardcoded
-- module. Changing one line ("5 litres of ZamZam" becoming 10) meant a
-- developer, a commit and a deploy.
--
-- The text was already shared by every package page, and that is worth
-- keeping: one edit should change the whole site. So this is a single global
-- registry of lists, not a per-package field.
--
-- A list belongs to a SECTION, which is the tab it renders under on a package
-- page. Sections are fixed in the app; the lists inside them are not, so a new
-- "Baggage policy" can be added from the dashboard without a deploy.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.site_content_lists (
  id uuid primary key default gen_random_uuid(),
  -- Which tab this renders under. The app knows these three names.
  section text not null check (section in ('inclusions', 'policies', 'notes')),
  key text not null unique,
  title text not null,
  -- A swatch name resolved to classes in the app, never raw CSS — same
  -- reasoning as package_tags.color.
  tone text not null default 'gold' check (tone in ('gold', 'emerald', 'rose')),
  items text[] not null default '{}',
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists site_content_lists_section_idx
on public.site_content_lists (section, sort_order);

-- ---------------------------------------------------------------------------
-- updated_at. Reuses the trigger function from migration 006.
-- ---------------------------------------------------------------------------
drop trigger if exists site_content_lists_updated_at on public.site_content_lists;
create trigger site_content_lists_updated_at
before update on public.site_content_lists
for each row execute function public.set_taxonomy_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: the public site renders these, so anyone may read; only admins write.
-- ---------------------------------------------------------------------------
alter table public.site_content_lists enable row level security;

drop policy if exists "Site content is public" on public.site_content_lists;
create policy "Site content is public"
on public.site_content_lists for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage site content" on public.site_content_lists;
create policy "Admins manage site content"
on public.site_content_lists for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed with exactly the text that was hardcoded, so running this migration
-- changes nothing a pilgrim can see. `do nothing` on conflict means a re-run
-- will never overwrite an edit made from the dashboard.
-- ---------------------------------------------------------------------------
insert into public.site_content_lists (section, key, title, tone, sort_order, items)
values
  (
    'inclusions',
    'inclusions',
    'What is included',
    'emerald',
    10,
    array[
      'Return Flights in Economy Class',
      'Visa & Insurance',
      'Hotels Stay',
      'Breakfast, Lunch & Dinner',
      'Airport Pickup & Drop',
      'Round Trip Transfer',
      'Taif Visit on SIC Basis',
      'Badar Visit on SIC Basis',
      'Laundry Services',
      'Local Ziyarats in Makkah on SIC Basis',
      'Local Ziyarats in Madina on SIC Basis',
      'Rowda Permit',
      'Saudi Sim (Talk Time Haji will Pay)',
      'Local staff at your service',
      '24/7 customer support',
      'Complimentary 5 liters ZAM-ZAM',
      'Welcome Kit'
    ]
  ),
  (
    'inclusions',
    'exclusions',
    'Not included',
    'rose',
    20,
    array[
      'Private Transfers',
      'GST 5% & TCS 5%',
      'Additional charges on excess luggage',
      'Tour operator/guide not accountable for lost luggage',
      'No room service',
      'Services not indicated in this package',
      'No refund on unutilized services',
      'No refund for curtailed stay'
    ]
  ),
  (
    'policies',
    'payment-policy',
    'Payment policy',
    'gold',
    10,
    array[
      'A minimum of Rs. 40,000 per person must be paid to secure a booking if the departure date is after 21 days.',
      '50% of the total amount is due 21 to 30 days before departure.',
      'Full payment is required 21 days before departure, or the booking will be canceled without prior notice.',
      'The tour cost remains the same for bookings through Agents, but the company is not responsible for any cash transactions with Agents.',
      'For bookings within 21 days of departure, 100% payment is required.',
      'For advance bookings, 100% payment must be cleared at least 21 days before departure.',
      'No tickets will be issued if the payment for tickets is not completed 21 days before departure, in accordance with airline regulations.',
      'Indian passport valid for at least 6 months having minimum 2 blank pages.',
      'Pan card copy (Linked with Aadhar Number).'
    ]
  ),
  (
    'policies',
    'cancellation-policy',
    'Cancellation policy',
    'rose',
    20,
    array[
      'Rs. 40,000 per person is non-refundable.',
      '50% of the package amount is non-refundable if canceled 21 to 30 days before departure.',
      '100% of the package amount is non-refundable if canceled within 21 days of departure.',
      'Date change charges: Rs. 10,000 per person, plus any applicable additional charges, for changes made 21 to 30 days before departure. Otherwise, the cancellation policies apply.',
      'No date changes are allowed within 20 days of departure; cancellations apply.'
    ]
  ),
  (
    'notes',
    'travel-notes',
    'Important travel notes',
    'gold',
    10,
    array[
      'Influenza and meningitis vaccination is compulsory and take vaccination 10 days prior to travel.',
      'While traveling to carry all original documents is compulsory.',
      'In case of package booked without umrah visa through us, then transportation will be subject to availability.',
      'Extra luggage other than mentioned on ticket would be paid by the pilgrim.',
      'Unutilized services are Non-refundable.',
      'Rooms Allotment as per hotel management, no room choice will be entertained.',
      'Flight Tickets can be availed at an approximate additional cost of INR 36,500. The final price, however, is subject to the fare at the time of ticket issuance.',
      'Rooms Check-In time at 04 PM and Check-Out time at 12 PM (Saudi Local time).'
    ]
  ),
  (
    'notes',
    'required-documents',
    'Required documents',
    'emerald',
    20,
    array[
      'Passport',
      'VISA (Saudi Multiple/ Umrah)',
      'Both original vaccination certificate (taken 10 days prior)',
      'Along with photo copies of all documents.'
    ]
  )
on conflict (key) do nothing;
