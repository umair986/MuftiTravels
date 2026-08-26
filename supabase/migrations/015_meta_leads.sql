-- ============================================================================
-- Meta lead ads inbox.
--
-- Leads from Facebook/Instagram lead forms currently live in a spreadsheet and
-- are worked by hand. This table backs an admin import screen so they get the
-- same treatment website enquiries do: a status, follow-up notes and a
-- one-tap WhatsApp reply.
--
-- Deliberately a separate table from public.enquiries, not extra columns on it:
--
--   * Meta leads have a different shape. No party size, no travel date, no
--     package name — the columns that make an enquiry row meaningful are all
--     empty for them.
--   * public.enquiries carries an anonymous insert path plus the abuse controls
--     from 010_enquiry_hardening.sql, including a BEFORE INSERT trigger that
--     caps inserts at 5 per hour per source hash. A 200-row spreadsheet import
--     would be rejected from row six onward. This table has no anon path and no
--     throttle, so bulk import is a normal operation rather than an exception
--     carved into a security control.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.meta_leads (
  id uuid primary key default gen_random_uuid(),

  -- Deduplication key, computed by the importer: Meta's own lead id when the
  -- export carries one, otherwise phone + submission time. Unique, so
  -- re-uploading a sheet that overlaps last week's adds only what is new and
  -- never resets a status somebody already set.
  dedupe_key text not null,

  name text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',

  campaign_name text not null default '',
  adset_name text not null default '',
  ad_name text not null default '',
  form_name text not null default '',

  -- Every column of the uploaded row, verbatim. A field-mapping mistake is then
  -- recoverable from the database instead of by asking for the file again.
  raw jsonb not null default '{}'::jsonb,

  -- The subset of `raw` worth showing: the lead form's own questions and their
  -- answers ("When do you plan to travel?"). Resolved at import time, because
  -- only the importer knows which headers a mapped column already consumed —
  -- guessing that at display time misfires on questions that merely contain a
  -- field name.
  extra jsonb not null default '{}'::jsonb,

  status text not null default 'new'
    check (status in (
      'new', 'contacted', 'not_picked_up',
      'interested', 'not_interested', 'closed'
    )),
  admin_notes text not null default '',

  -- Meta's submission time when the sheet provides it, else the import time.
  -- This is what the list sorts on, so leads read in the order they arrived.
  created_at timestamptz not null default timezone('utc', now()),
  imported_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Shape limits. Sized to match the equivalent constraints on public.enquiries
-- so the two inboxes cannot disagree about what a valid name or phone is.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meta_leads_dedupe_key_len') then
    alter table public.meta_leads
      add constraint meta_leads_dedupe_key_len
      check (char_length(dedupe_key) between 1 and 200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'meta_leads_text_len') then
    alter table public.meta_leads
      add constraint meta_leads_text_len
      check (
        char_length(name) <= 120
        and char_length(phone) <= 32
        and char_length(email) <= 200
        and char_length(city) <= 80
        and char_length(campaign_name) <= 200
        and char_length(adset_name) <= 200
        and char_length(ad_name) <= 200
        and char_length(form_name) <= 200
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'meta_leads_notes_len') then
    alter table public.meta_leads
      add constraint meta_leads_notes_len
      check (char_length(admin_notes) <= 2000);
  end if;
end $$;

-- The uniqueness that makes re-importing safe.
create unique index if not exists meta_leads_dedupe_key_idx
on public.meta_leads (dedupe_key);

-- The list is always "one status, newest first".
create index if not exists meta_leads_status_created_idx
on public.meta_leads (status, created_at desc);

create index if not exists meta_leads_created_idx
on public.meta_leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Access. Admins only, in both directions.
--
-- Unlike public.enquiries there is no anonymous insert policy: rows reach this
-- table only through the admin import screen, so `anon` has no reason to touch
-- it at all. These rows are customer names and phone numbers.
-- ---------------------------------------------------------------------------
alter table public.meta_leads enable row level security;

drop policy if exists "Admins manage meta leads" on public.meta_leads;
create policy "Admins manage meta leads"
on public.meta_leads for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
