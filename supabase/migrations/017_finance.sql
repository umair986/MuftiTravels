-- ============================================================================
-- Finance: expenses, invoices, payments.
--
-- Two features were asked for — an expense tracker and an invoice generator —
-- and they are built on one spine because separately each is half a tool. The
-- expense ledger cannot say whether a departure was profitable; the invoice
-- generator cannot say whether a bill was ever paid. What they share:
--
--   * one money representation (integer paise, never floats)
--   * one optional link to a departure (trip_id), so cost and revenue meet
--   * one record of payments received, because Umrah is sold on advance plus
--     balance rather than a single settlement
--
-- Two rules run through everything below. Both are load-bearing:
--
--   1. AN ISSUED INVOICE IS A HISTORICAL FACT, NOT A VIEW OF CURRENT DATA.
--      Customer name, line descriptions and amounts are copied onto the row
--      and never joined live. Editing a package price in November must not
--      silently rewrite an invoice raised in April, and under GST an issued
--      invoice cannot be edited at all — it is cancelled and reissued.
--
--   2. EVERY FIELD ON AN INVOICE IS TYPED BY THE ADMIN.
--      There is no package_id anywhere in the invoice tables, not even one
--      kept "for reporting". Package names change constantly, much of what
--      gets billed (a standalone visa, an extra night, a negotiated rate) is
--      not a catalogue row at all, and the catalogue is edited for marketing
--      reasons — coupling billing to it would make a copy tweak on the public
--      site a change to accounting data.
--
-- Design notes are in docs/finance-expenses-and-invoicing.md.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- business_profile — one row, holding everything the invoice PDF prints.
--
-- Exactly one row, enforced by the primary key check rather than by
-- convention: a second row would mean two possible answers to "what is our
-- GSTIN", and the wrong one would end up on a customer's bill.
-- ---------------------------------------------------------------------------
create table if not exists public.business_profile (
  id smallint primary key default 1 check (id = 1),

  legal_name text not null default 'Mufti Travels',
  trade_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  -- GST state code, e.g. '27' for Maharashtra. Compared against the customer's
  -- place of supply to decide CGST+SGST versus IGST.
  state_code text not null default '',
  pincode text not null default '',

  phone text not null default '',
  email text not null default '',
  website text not null default '',
  gstin text not null default '',
  pan text not null default '',

  -- Printed on the invoice so a customer can transfer without asking.
  bank_name text not null default '',
  bank_account_name text not null default '',
  bank_account_number text not null default '',
  bank_ifsc text not null default '',
  upi_id text not null default '',

  -- Base64 data URIs rather than storage paths. @react-pdf/renderer fetches
  -- <Image src> over the network, which means CORS and a race on a slow link
  -- at exactly the moment somebody is waiting on a bill. Both images are small
  -- and change roughly never, so they are inlined.
  logo_data_uri text not null default '',
  signature_data_uri text not null default '',

  -- Invoice numbers are '{prefix}/{fy}/{seq}'. GST caps the whole number at 16
  -- characters, so the prefix budget is small.
  invoice_prefix text not null default 'MT'
    check (char_length(invoice_prefix) between 1 and 4),
  invoice_terms text not null default '',

  -- Defaults copied onto a new draft, not applied to existing invoices.
  -- 'none' until the GST questions in the design doc are answered.
  default_tax_mode text not null default 'none'
    check (default_tax_mode in ('none', 'cgst_sgst', 'igst')),
  -- Basis points: 500 = 5%, 1800 = 18%. An integer so a fractional rate never
  -- needs a float.
  default_tax_rate_bp integer not null default 0
    check (default_tax_rate_bp between 0 and 10000),

  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.business_profile (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- trips — a departure. "Umrah · Delhi · 12 Mar 2027".
--
-- Deliberately no package_id: per rule 2 the name is typed, like everything
-- else. This table exists so that expenses and invoices can be tagged to the
-- same departure and Phase 4 can answer "did that batch make money?".
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  departure_date date,
  return_date date,
  status text not null default 'planned'
    check (status in ('planned', 'running', 'completed', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists trips_departure_idx
on public.trips (departure_date desc nulls last);

-- ---------------------------------------------------------------------------
-- expense_categories.
--
-- `kind` separates costs a departure should carry from costs the business
-- carries regardless. Without it, per-trip margin quietly absorbs the office
-- rent and every P&L in Phase 4 is wrong in the same direction.
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'trip' check (kind in ('trip', 'operating')),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists expense_categories_sort_idx
on public.expense_categories (sort_order, name);

insert into public.expense_categories (name, kind, sort_order) values
  ('Hotel - Makkah',      'trip',      10),
  ('Hotel - Madinah',     'trip',      20),
  ('Visa',                'trip',      30),
  ('Air ticket',          'trip',      40),
  ('Ground transport',    'trip',      50),
  ('Food',                'trip',      60),
  ('Ziyarat',             'trip',      70),
  ('Guide / Muallim',     'trip',      80),
  ('Salaries',            'operating', 110),
  ('Office rent',         'operating', 120),
  ('Marketing - Meta ads','operating', 130),
  ('Bank charges',        'operating', 140),
  ('Miscellaneous',       'operating', 200)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- expenses.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,

  -- on delete restrict, not cascade: deleting a category must never take the
  -- spending with it. Categories are deactivated (is_active), not removed.
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  trip_id uuid references public.trips (id) on delete set null,

  vendor text not null default '',
  description text not null default '',

  -- Canonical amount. Always INR, always integer paise. A float cannot hold
  -- ₹0.10 exactly and the drift shows up on a customer-facing total.
  amount_paise bigint not null check (amount_paise > 0),

  -- Makkah/Madinah hotels and ground transport are billed in SAR. Keeping what
  -- was actually paid, next to the INR figure and the rate used, means a later
  -- reconciliation against the bank statement agrees instead of arguing with a
  -- rate nobody wrote down.
  original_currency text not null default 'INR'
    check (char_length(original_currency) = 3),
  original_amount_minor bigint check (original_amount_minor is null or original_amount_minor > 0),
  fx_rate numeric(14, 6) check (fx_rate is null or fx_rate > 0),

  payment_method text not null default 'bank'
    check (payment_method in ('cash', 'bank', 'upi', 'card', 'cheque', 'other')),
  reference text not null default '',
  -- Object path in the private expense-receipts bucket, so a delete can remove
  -- the file and not just the row.
  receipt_path text not null default '',
  notes text not null default '',

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Soft delete. Financial rows do not vanish; a mistake is retracted so that
  -- last month's total stays explainable.
  deleted_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_text_len') then
    alter table public.expenses
      add constraint expenses_text_len
      check (
        char_length(vendor) <= 200
        and char_length(description) <= 500
        and char_length(reference) <= 120
        and char_length(notes) <= 2000
      );
  end if;

  -- A foreign-currency amount is meaningless without the rate that produced
  -- amount_paise, and vice versa. Either both or neither.
  if not exists (select 1 from pg_constraint where conname = 'expenses_fx_pair') then
    alter table public.expenses
      add constraint expenses_fx_pair
      check (
        (original_currency = 'INR' and original_amount_minor is null and fx_rate is null)
        or (original_currency <> 'INR' and original_amount_minor is not null and fx_rate is not null)
      );
  end if;
end $$;

-- Partial indexes: every list screen filters deleted rows out, so the indexes
-- should not carry them.
create index if not exists expenses_spent_on_idx
on public.expenses (spent_on desc) where deleted_at is null;

create index if not exists expenses_category_idx
on public.expenses (category_id, spent_on desc) where deleted_at is null;

create index if not exists expenses_trip_idx
on public.expenses (trip_id, spent_on desc) where trip_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- invoices.
--
-- Customer details are duplicated onto this row on purpose (rule 1). Nothing
-- here is joined back to a live record to render the document.
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  -- Null while draft. Allocated by issue_invoice() and never reused, because
  -- the series is required to be consecutive.
  number text unique,
  fy_label text,
  seq integer,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'cancelled')),

  issue_date date,
  due_date date,

  -- Customer snapshot.
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_address text not null default '',
  customer_state text not null default '',
  customer_state_code text not null default '',
  customer_gstin text not null default '',

  -- Provenance only, written once at creation so "did this lead convert?" is
  -- answerable. Never read back to render the invoice.
  source_enquiry_id uuid references public.enquiries (id) on delete set null,
  source_meta_lead_id uuid references public.meta_leads (id) on delete set null,
  -- A reporting tag, not a link: nothing it points at appears on the PDF.
  trip_id uuid references public.trips (id) on delete set null,

  -- Money, all integer paise. Denormalised from invoice_items when a draft is
  -- saved, so the list screen and the reports never aggregate to show a total.
  subtotal_paise bigint not null default 0 check (subtotal_paise >= 0),
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  taxable_paise bigint not null default 0 check (taxable_paise >= 0),
  tax_mode text not null default 'none'
    check (tax_mode in ('none', 'cgst_sgst', 'igst')),
  tax_rate_bp integer not null default 0 check (tax_rate_bp between 0 and 10000),
  cgst_paise bigint not null default 0 check (cgst_paise >= 0),
  sgst_paise bigint not null default 0 check (sgst_paise >= 0),
  igst_paise bigint not null default 0 check (igst_paise >= 0),
  -- GST rounds the payable to the nearest rupee. Stored explicitly, and may be
  -- negative, so the arithmetic below stays checkable instead of being fudged
  -- into the total.
  round_off_paise bigint not null default 0,
  total_paise bigint not null default 0 check (total_paise >= 0),
  amount_in_words text not null default '',

  notes text not null default '',
  terms text not null default '',
  -- Object path in the private invoices bucket. Set once, on issue: the file
  -- generated at that moment IS the invoice. Re-rendering months later would
  -- pick up a new logo or address and quietly disagree with the document the
  -- customer already holds.
  pdf_path text not null default '',

  issued_at timestamptz,
  issued_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  -- The identity that makes every total checkable at the database level rather
  -- than trusting whatever the browser computed.
  if not exists (select 1 from pg_constraint where conname = 'invoices_total_balances') then
    alter table public.invoices
      add constraint invoices_total_balances
      check (
        total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise + round_off_paise
      );
  end if;

  -- An issued invoice without a number would be a hole in the series.
  if not exists (select 1 from pg_constraint where conname = 'invoices_issued_has_number') then
    alter table public.invoices
      add constraint invoices_issued_has_number
      check (
        status <> 'issued'
        or (number is not null and issue_date is not null and fy_label is not null)
      );
  end if;

  -- Tax split has to match the mode, or the PDF and the database disagree
  -- about which columns to print.
  if not exists (select 1 from pg_constraint where conname = 'invoices_tax_mode_split') then
    alter table public.invoices
      add constraint invoices_tax_mode_split
      check (
        (tax_mode = 'none'      and cgst_paise = 0 and sgst_paise = 0 and igst_paise = 0)
        or (tax_mode = 'cgst_sgst' and igst_paise = 0)
        or (tax_mode = 'igst'      and cgst_paise = 0 and sgst_paise = 0)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_text_len') then
    alter table public.invoices
      add constraint invoices_text_len
      check (
        char_length(number) <= 16
        and char_length(customer_name) <= 200
        and char_length(customer_phone) <= 32
        and char_length(customer_email) <= 200
        and char_length(customer_address) <= 500
        and char_length(customer_gstin) <= 20
        and char_length(notes) <= 2000
        and char_length(terms) <= 4000
        and char_length(cancel_reason) <= 500
      );
  end if;
end $$;

create index if not exists invoices_status_created_idx
on public.invoices (status, created_at desc);

create index if not exists invoices_issue_date_idx
on public.invoices (issue_date desc nulls last);

create index if not exists invoices_trip_idx
on public.invoices (trip_id) where trip_id is not null;

-- ---------------------------------------------------------------------------
-- invoice_items.
--
-- Every column is typed by the admin. No package_id, no reference to the
-- catalogue of any kind — see rule 2 at the top of this file.
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  -- Tour operator services sit under SAC 9985 / 998555, but a package line and
  -- an air-ticket line may differ, so this is per line rather than per invoice.
  sac_code text not null default '',
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  line_total_paise bigint not null check (line_total_paise >= 0),
  sort_order integer not null default 0
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_text_len') then
    alter table public.invoice_items
      add constraint invoice_items_text_len
      check (
        char_length(description) between 1 and 500
        and char_length(sac_code) <= 12
      );
  end if;
end $$;

create index if not exists invoice_items_invoice_idx
on public.invoice_items (invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- invoice_payments — receipts against an invoice.
--
-- A separate table rather than a paid/unpaid flag on the invoice, because
-- Umrah is sold as an advance plus one or more balance payments and the
-- question "how much is still outstanding" has to have a real answer.
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  paid_on date not null default current_date,
  amount_paise bigint not null check (amount_paise > 0),
  method text not null default 'bank'
    check (method in ('cash', 'bank', 'upi', 'card', 'cheque', 'other')),
  reference text not null default '',
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_payments_text_len') then
    alter table public.invoice_payments
      add constraint invoice_payments_text_len
      check (char_length(reference) <= 120 and char_length(notes) <= 1000);
  end if;
end $$;

create index if not exists invoice_payments_invoice_idx
on public.invoice_payments (invoice_id, paid_on);

create index if not exists invoice_payments_paid_on_idx
on public.invoice_payments (paid_on desc);

-- ---------------------------------------------------------------------------
-- invoice_counters — one row per financial year, holding the next sequence.
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_counters (
  fy_label text primary key,
  next_seq integer not null default 1 check (next_seq >= 1)
);

-- ---------------------------------------------------------------------------
-- invoice_line_presets.
--
-- Rule 2 makes every line free text, which is flexible and tedious in equal
-- measure — nobody wants to retype "Umrah Package · 14 Days · Deluxe" on every
-- bill. Picking a preset COPIES its text and rate into the line and then
-- forgets about it: editing the line does not touch the preset, and editing or
-- deleting the preset does not touch any invoice, draft or issued.
--
-- That is why this is a keyboard shortcut with a table behind it and not a
-- relationship. Nothing references it.
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_line_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text not null,
  sac_code text not null default '',
  default_unit_price_paise bigint not null default 0
    check (default_unit_price_paise >= 0),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_line_presets_text_len') then
    alter table public.invoice_line_presets
      add constraint invoice_line_presets_text_len
      check (
        char_length(label) between 1 and 120
        and char_length(description) between 1 and 500
        and char_length(sac_code) <= 12
      );
  end if;
end $$;

create index if not exists invoice_line_presets_sort_idx
on public.invoice_line_presets (sort_order, label) where is_active;

-- ---------------------------------------------------------------------------
-- updated_at triggers. Reuses the function from migration 006.
-- ---------------------------------------------------------------------------
drop trigger if exists business_profile_updated_at on public.business_profile;
create trigger business_profile_updated_at
before update on public.business_profile
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists trips_updated_at on public.trips;
create trigger trips_updated_at
before update on public.trips
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists expense_categories_updated_at on public.expense_categories;
create trigger expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
before update on public.expenses
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
before update on public.invoices
for each row execute function public.set_taxonomy_updated_at();

drop trigger if exists invoice_line_presets_updated_at on public.invoice_line_presets;
create trigger invoice_line_presets_updated_at
before update on public.invoice_line_presets
for each row execute function public.set_taxonomy_updated_at();

-- ---------------------------------------------------------------------------
-- An issued invoice is immutable except for the few fields that are allowed to
-- change after issue: the stored PDF path, and cancellation.
--
-- The application is careful about this, but the application is not the last
-- word — a mistaken PATCH from the browser console would otherwise rewrite a
-- customer's bill after they had been sent it. Enforced here instead.
-- ---------------------------------------------------------------------------
create or replace function public.guard_issued_invoice()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'issued' then
    if new.status not in ('issued', 'cancelled') then
      raise exception 'an issued invoice cannot return to %', new.status;
    end if;

    if (new.number, new.fy_label, new.seq, new.issue_date, new.issued_at)
       is distinct from
       (old.number, old.fy_label, old.seq, old.issue_date, old.issued_at)
    then
      raise exception 'the number and issue date of an issued invoice are fixed';
    end if;

    if (new.subtotal_paise, new.discount_paise, new.taxable_paise,
        new.tax_mode, new.tax_rate_bp, new.cgst_paise, new.sgst_paise,
        new.igst_paise, new.round_off_paise, new.total_paise)
       is distinct from
       (old.subtotal_paise, old.discount_paise, old.taxable_paise,
        old.tax_mode, old.tax_rate_bp, old.cgst_paise, old.sgst_paise,
        old.igst_paise, old.round_off_paise, old.total_paise)
    then
      raise exception 'the amounts on an issued invoice cannot be changed; cancel and reissue';
    end if;

    if (new.customer_name, new.customer_phone, new.customer_email,
        new.customer_address, new.customer_state, new.customer_state_code,
        new.customer_gstin)
       is distinct from
       (old.customer_name, old.customer_phone, old.customer_email,
        old.customer_address, old.customer_state, old.customer_state_code,
        old.customer_gstin)
    then
      raise exception 'the customer details on an issued invoice cannot be changed; cancel and reissue';
    end if;
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'a cancelled invoice cannot be reopened';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_guard_issued on public.invoices;
create trigger invoices_guard_issued
before update on public.invoices
for each row execute function public.guard_issued_invoice();

-- Line items follow the invoice: once it is issued, they are frozen too.
-- Without this the totals would be locked while the descriptions were not.
create or replace function public.guard_issued_invoice_items()
returns trigger
language plpgsql
as $$
declare
  v_invoice uuid;
  v_status text;
begin
  v_invoice := coalesce(new.invoice_id, old.invoice_id);
  select status into v_status from public.invoices where id = v_invoice;

  -- Deleting the parent invoice cascades to here; that is not an edit.
  if v_status is null then
    return coalesce(new, old);
  end if;

  if v_status <> 'draft' then
    raise exception 'the line items of a % invoice cannot be changed', v_status;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_items_guard_issued on public.invoice_items;
create trigger invoice_items_guard_issued
before insert or update or delete on public.invoice_items
for each row execute function public.guard_issued_invoice_items();

-- ---------------------------------------------------------------------------
-- invoice_balances — payment status, derived rather than stored.
--
-- A stored paid/unpaid flag is one more thing to keep in sync and to be wrong
-- about. There are few payments per invoice, so the aggregate is cheap.
-- ---------------------------------------------------------------------------
create or replace view public.invoice_balances as
select
  i.id,
  i.total_paise,
  coalesce(sum(p.amount_paise), 0)                 as paid_paise,
  i.total_paise - coalesce(sum(p.amount_paise), 0) as balance_paise,
  case
    when i.status <> 'issued'                              then i.status
    when coalesce(sum(p.amount_paise), 0) = 0              then 'unpaid'
    when coalesce(sum(p.amount_paise), 0) >= i.total_paise then 'paid'
    else 'partial'
  end                                              as payment_status
from public.invoices i
left join public.invoice_payments p on p.invoice_id = i.id
group by i.id;

-- A view is owned by its creator and would otherwise run with those rights,
-- bypassing the RLS on the tables underneath. security_invoker makes it run as
-- the caller, so the admin-only policies below apply to it too.
alter view public.invoice_balances set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Financial year. India runs 1 April to 31 March.
--   2026-08-31 -> '26-27'      2027-02-10 -> '26-27'      2027-04-01 -> '27-28'
-- ---------------------------------------------------------------------------
create or replace function public.fy_label(d date)
returns text
language sql
immutable
as $$
  select case
    when extract(month from d) >= 4
      then to_char(d, 'YY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YY') || '-' || to_char(d, 'YY')
  end;
$$;

-- ---------------------------------------------------------------------------
-- issue_invoice — allocate a number and freeze the document, atomically.
--
-- The number is allocated HERE and not at creation. If drafts were numbered on
-- creation, every abandoned draft would leave a permanent hole in a series
-- that is required to be consecutive, and each hole would need explaining.
--
-- Two admins pressing "Issue" at the same instant must not receive the same
-- number. The `update ... returning` below takes a row lock on the counter, so
-- the second caller waits and receives the next value. The unique index on
-- invoices.number is the backstop if that reasoning is ever wrong.
--
-- SECURITY DEFINER, because the counter table is not something the app should
-- be able to write directly — which means the admin check has to be made
-- explicitly, since RLS is bypassed inside.
-- ---------------------------------------------------------------------------
create or replace function public.issue_invoice(
  p_invoice uuid,
  p_issue_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fy text;
  v_seq integer;
  v_prefix text;
  v_number text;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select status into v_status from public.invoices where id = p_invoice;

  if v_status is null then
    raise exception 'invoice % does not exist', p_invoice;
  end if;

  if v_status <> 'draft' then
    raise exception 'invoice % is already %', p_invoice, v_status;
  end if;

  -- An invoice with no lines has a zero total and a number burned against it.
  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice) then
    raise exception 'invoice % has no line items', p_invoice;
  end if;

  v_fy := public.fy_label(p_issue_date);
  select invoice_prefix into v_prefix from public.business_profile where id = 1;
  v_prefix := coalesce(v_prefix, 'MT');

  insert into public.invoice_counters (fy_label, next_seq)
  values (v_fy, 1)
  on conflict (fy_label) do nothing;

  update public.invoice_counters
     set next_seq = next_seq + 1
   where fy_label = v_fy
  returning next_seq - 1 into v_seq;

  v_number := v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, 4, '0');

  update public.invoices
     set number     = v_number,
         fy_label   = v_fy,
         seq        = v_seq,
         status     = 'issued',
         issue_date = p_issue_date,
         issued_at  = timezone('utc', now()),
         issued_by  = auth.uid(),
         updated_at = timezone('utc', now())
   where id = p_invoice;

  return v_number;
end;
$$;

revoke all on function public.issue_invoice(uuid, date) from public;
grant execute on function public.issue_invoice(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Access. Admins only, in both directions, for every table here.
--
-- Same shape as meta_leads in migration 015 and for a stronger reason: these
-- rows are revenue, bank references, vendor bills and customer billing
-- addresses. Nothing on the public site reads or writes any of it, so there is
-- no anonymous path at all.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'business_profile', 'trips', 'expense_categories', 'expenses',
    'invoices', 'invoice_items', 'invoice_payments', 'invoice_counters',
    'invoice_line_presets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins manage %s" on public.%I', t, t);
    execute format(
      'create policy "Admins manage %s" on public.%I for all to authenticated '
      'using (public.is_admin()) with check (public.is_admin())', t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage — two PRIVATE buckets.
--
-- Not public like package-images and gallery-images. A receipt carries vendor
-- names, amounts and bank references; an invoice PDF carries a customer's name
-- and billing address. Both are reached through short-lived signed URLs, which
-- is also what makes it possible to send an invoice over WhatsApp: a wa.me
-- link cannot carry an attachment, but it can carry a link that expires.
--
-- Limits and MIME allowlists follow migration 016 — the browser's `accept`
-- attribute is a file-picker hint, not a control.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts', 'expense-receipts', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices', 'invoices', false, 8388608,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf'];

-- No anon select policy on either bucket: private means private, and reads go
-- through signed URLs created by an authenticated admin.
drop policy if exists "Admins read expense receipts" on storage.objects;
create policy "Admins read expense receipts"
on storage.objects for select
to authenticated
using (bucket_id = 'expense-receipts' and public.is_admin());

drop policy if exists "Admins upload expense receipts" on storage.objects;
create policy "Admins upload expense receipts"
on storage.objects for insert
to authenticated
with check (bucket_id = 'expense-receipts' and public.is_admin());

drop policy if exists "Admins update expense receipts" on storage.objects;
create policy "Admins update expense receipts"
on storage.objects for update
to authenticated
using (bucket_id = 'expense-receipts' and public.is_admin())
with check (bucket_id = 'expense-receipts' and public.is_admin());

drop policy if exists "Admins delete expense receipts" on storage.objects;
create policy "Admins delete expense receipts"
on storage.objects for delete
to authenticated
using (bucket_id = 'expense-receipts' and public.is_admin());

drop policy if exists "Admins read invoice pdfs" on storage.objects;
create policy "Admins read invoice pdfs"
on storage.objects for select
to authenticated
using (bucket_id = 'invoices' and public.is_admin());

drop policy if exists "Admins upload invoice pdfs" on storage.objects;
create policy "Admins upload invoice pdfs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'invoices' and public.is_admin());

-- Deliberately no update policy on the invoices bucket. The PDF written when
-- an invoice is issued is the document the customer holds; overwriting it is
-- not an operation this application should be able to perform.
drop policy if exists "Admins update invoice pdfs" on storage.objects;

drop policy if exists "Admins delete invoice pdfs" on storage.objects;
create policy "Admins delete invoice pdfs"
on storage.objects for delete
to authenticated
using (bucket_id = 'invoices' and public.is_admin());
