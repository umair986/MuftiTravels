-- ============================================================================
-- Enquiry abuse controls.
--
-- `public.enquiries` accepts inserts from `anon`, which is correct — the
-- contact form has to work for visitors. But the policy was `with check (true)`
-- with no length limits, no format checks and no throttle, so anyone holding
-- the public anon key (it ships in the client bundle by design) could flood the
-- table and bury real leads.
--
-- There is no server-side API layer in this app, so these controls have to live
-- in Postgres. Three layers:
--   1. CHECK constraints  — bound the shape and size of a row
--   2. a rate-limit trigger — bound how many rows one source can create
--   3. a honeypot column  — silently drop obvious bots
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Shape and size limits.
--
-- Added NOT VALID first so any existing rows that violate them do not block the
-- migration; new rows are checked immediately. Validate later once the table is
-- known clean:  alter table public.enquiries validate constraint <name>;
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enquiries_name_len') then
    alter table public.enquiries
      add constraint enquiries_name_len
      check (char_length(name) between 1 and 120) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'enquiries_email_shape') then
    alter table public.enquiries
      add constraint enquiries_email_shape
      check (email = '' or (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'enquiries_phone_len') then
    alter table public.enquiries
      add constraint enquiries_phone_len
      check (char_length(phone) <= 32) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'enquiries_notes_len') then
    alter table public.enquiries
      add constraint enquiries_notes_len
      check (char_length(notes) <= 2000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'enquiries_free_text_len') then
    alter table public.enquiries
      add constraint enquiries_free_text_len
      check (
        char_length(departure_city) <= 80
        and char_length(package_preference) <= 120
        and char_length(package_name) <= 200
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'enquiries_party_size') then
    alter table public.enquiries
      add constraint enquiries_party_size
      check (adults between 1 and 60 and children between 0 and 60) not valid;
  end if;

  -- A pilgrimage booked more than three years out is a bot, not a customer.
  if not exists (select 1 from pg_constraint where conname = 'enquiries_date_window') then
    alter table public.enquiries
      add constraint enquiries_date_window
      check (
        preferred_date is null
        or preferred_date between current_date - interval '1 day'
                              and current_date + interval '3 years'
      ) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Per-source rate limit.
--
-- Stores a salted hash of the caller's IP, never the address itself, so the
-- table holds no new personal data. The salt is the table OID, which is stable
-- per database and not attacker-known.
-- ---------------------------------------------------------------------------
alter table public.enquiries
add column if not exists source_hash text not null default '';

comment on column public.enquiries.source_hash is
  'Salted hash of the submitting IP, used only for rate limiting. Not reversible, never displayed.';

create index if not exists enquiries_source_hash_created_idx
on public.enquiries (source_hash, created_at desc);

create or replace function public.enquiry_source_hash()
returns text
language plpgsql
stable
as $$
declare
  headers json;
  raw_ip text;
begin
  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;

  raw_ip := coalesce(
    split_part(headers ->> 'x-forwarded-for', ',', 1),
    headers ->> 'cf-connecting-ip',
    'unknown'
  );

  return encode(
    digest(btrim(raw_ip) || ':' || 'public.enquiries'::regclass::oid::text, 'sha256'),
    'hex'
  );
end;
$$;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.enforce_enquiry_limits()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  hash text;
  recent_count integer;
begin
  -- Honeypot: a field no human sees. Accept the row silently so a bot cannot
  -- tell it was caught, but never store it.
  if coalesce(new.honeypot, '') <> '' then
    return null;
  end if;

  hash := public.enquiry_source_hash();
  new.source_hash := hash;

  if hash <> 'unknown' then
    select count(*) into recent_count
    from public.enquiries
    where source_hash = hash
      and created_at > timezone('utc', now()) - interval '1 hour';

    if recent_count >= 5 then
      raise exception 'Too many enquiries from this connection. Please try again later or message us on WhatsApp.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Honeypot column. Never persisted with a value — the trigger drops any row
--    that has one — but the form needs somewhere to send it.
-- ---------------------------------------------------------------------------
alter table public.enquiries
add column if not exists honeypot text;

drop trigger if exists enquiries_enforce_limits on public.enquiries;
create trigger enquiries_enforce_limits
before insert on public.enquiries
for each row execute function public.enforce_enquiry_limits();

-- ---------------------------------------------------------------------------
-- 4. Narrow the insert policy. Anonymous submitters may only create rows in the
--    'new' state; they must not be able to pick a status or backdate a row.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can submit enquiries" on public.enquiries;
create policy "Anyone can submit enquiries"
on public.enquiries for insert
to anon, authenticated
with check (status = 'new' and admin_notes = '');
