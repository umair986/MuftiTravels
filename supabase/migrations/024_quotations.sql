-- ============================================================================
-- Quotations: the priced offer that goes out before an invoice exists.
--
-- An admin takes a call — "Silver package from Mumbai, ten of us, give us a
-- discount" — and says "let me get back to you with the quotation". Until now
-- there was nothing to get back with: the only document this application could
-- produce was a GST invoice, which is the wrong tool for an offer that has not
-- been accepted yet.
--
-- This migration is a sibling of 017, not an extension of it. The tables below
-- deliberately mirror invoices / invoice_items column for column, so that
-- converting an accepted quotation into a draft invoice is a copy with no
-- renaming, and so that anyone who has read 017 can read this without a second
-- thought. What differs, differs on purpose.
--
-- The rule that decides every argument here:
--
--   A QUOTATION IS AN OFFER, NOT A RECORD. AN INVOICE IS A RECORD, NOT AN
--   OFFER.
--
-- Everything in 017 descends from "an issued invoice is a historical fact" — a
-- document with legal weight, a number consumed from a consecutive series, and
-- amounts that cannot be edited after issue. A quotation states what we are
-- willing to charge today. When the customer pushes back, the right answer is a
-- better quotation, not a cancellation and a credit note. So four of 017's
-- rules are reversed here, each for a stated reason:
--
--   1. IT MAY READ THE CATALOGUE. 017's Decision 5 bans package_id from the
--      invoice tables because a package re-priced in November must not rewrite
--      a bill raised in April. That failure is caused by a live join at render
--      time, not by reading a price once when the admin picks a package and
--      copying it into an editable field. quotation_items still stores text and
--      amounts only; source_package_slug is a note, never a join.
--
--   2. IT STAYS EDITABLE AFTER SENDING. guard_issued_invoice() exists to make a
--      sent document unchangeable. Cloning it here would make the feature
--      useless, because editing is the entire point. Instead `revision` counts
--      how many times the quotation has been SENT, the stored PDF path carries
--      that number, and the bucket has no update policy — so a link the
--      customer already holds keeps opening what they were actually sent. That
--      is 017's "stored PDFs are never overwritten", kept.
--
--   3. IT PRINTS ITS INCLUSIONS. An invoice deliberately does not (017's
--      Decision 8): restating marketing copy on a demand for money invites an
--      argument about whether a promise was kept. A quotation is sold on its
--      inclusions, so it carries them.
--
--   4. ITS NUMBERS CARRY NO LEGAL CONSTRAINT. Still allocated at send rather
--      than at creation, but for the plainer reason that a draft is not yet an
--      offer. Gaps in the series are harmless.
--
-- Kept without exception from 017: money is integer paise, never a float; the
-- customer block is a snapshot, never a live join; admins only, in both
-- directions, with no anonymous path at all.
--
-- Design notes, with the options rejected, are in docs/quotations.md.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- business_profile — the quotation series and how long an offer stands.
--
-- quote_prefix is its own column rather than invoice_prefix || 'Q'. A business
-- that wants EST/ quotes and MT/ bills should not have to rename its invoices
-- to get them.
--
-- quote_validity_days is the default only. The editor can set valid_until to
-- anything; this is what it reaches for when nobody said otherwise.
-- ---------------------------------------------------------------------------
alter table public.business_profile
  add column if not exists quote_prefix text not null default 'MTQ',
  add column if not exists quote_validity_days integer not null default 7;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_profile_quote_prefix_len') then
    alter table public.business_profile
      add constraint business_profile_quote_prefix_len
      check (char_length(quote_prefix) between 1 and 5);
  end if;

  -- An offer that stands for zero days is not an offer, and one that stands for
  -- a decade is not a price.
  if not exists (select 1 from pg_constraint where conname = 'business_profile_quote_validity') then
    alter table public.business_profile
      add constraint business_profile_quote_validity
      check (quote_validity_days between 1 and 365);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- quotations — one offer, to one customer, for one costing.
--
-- Three groups of columns are new relative to invoices, and each exists because
-- the invoice shape cannot answer something the customer actually said:
--
--   departure_city / travel_date   "from Mumbai, sometime in March". There is
--                                  no departure-city field anywhere in the
--                                  catalogue — it is encoded only in package
--                                  names and slugs — and it is the first thing
--                                  out of the customer's mouth.
--
--   pax                            "we are ten people". Drives the per-person
--                                  figure the quotation prints, which is the
--                                  number being negotiated. Nullable, because a
--                                  quotation for a standalone visa has no
--                                  meaningful head count.
--
--   discount_mode /                "give us a discount because we're ten".
--   discount_percent_bp            discount_paise alone cannot print
--                                  "Discount (5%)", and that label is the
--                                  concession the customer negotiated.
--
-- Deliberately absent: a cancelled status. An invoice is cancelled because its
-- number is burned and the document exists in law. A quotation that came to
-- nothing is 'declined', or it simply expires.
-- ---------------------------------------------------------------------------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),

  -- Null while draft. Allocated by send_quotation(), because the number is what
  -- the customer refers to on the phone and handing one out before anything was
  -- sent means the two of you can disagree about whether it exists.
  number   text unique,
  fy_label text,
  seq      integer,
  status   text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined')),

  -- How many times this has been SENT, not how many times it has been edited.
  -- "Revision 2" is a thing the customer can have received; counting edits
  -- would print "Revision 7" on the second document they ever saw. It also
  -- means the storage path below changes exactly when a new file is written.
  revision integer not null default 1 check (revision >= 1),

  quote_date date not null default current_date,
  sent_on    date,
  -- sent_at is not redundant with sent_on. Comparing updated_at against it is
  -- how the editor can say "edited since you sent this" rather than quietly
  -- letting the admin believe the customer has the current version.
  sent_at     timestamptz,
  valid_until date,
  accepted_on date,
  declined_reason text not null default '',

  -- Customer snapshot. The same seven columns as invoices, for the same reason
  -- and in the same order, so the copy on conversion is field for field.
  customer_name       text not null default '',
  customer_phone      text not null default '',
  customer_email      text not null default '',
  customer_address    text not null default '',
  customer_state      text not null default '',
  customer_state_code text not null default '',
  customer_gstin      text not null default '',

  departure_city text not null default '',
  travel_date    date,
  pax            integer check (pax is null or pax > 0),

  -- Provenance, exactly as on invoices: kept to answer "did this lead convert?"
  -- and never read back to render anything.
  source_enquiry_id   uuid references public.enquiries  (id) on delete set null,
  source_meta_lead_id uuid references public.meta_leads (id) on delete set null,
  trip_id             uuid references public.trips      (id) on delete set null,

  -- Money. Integer paise throughout, and the same arithmetic as an invoice:
  -- src/lib/finance.ts computeInvoiceTotals is reused unchanged, because
  -- "subtotal, then one discount, then tax on what remains, then round" is
  -- already exactly what a quotation needs.
  subtotal_paise bigint not null default 0 check (subtotal_paise >= 0),

  discount_mode text not null default 'none'
    check (discount_mode in ('none', 'amount', 'percent')),
  discount_percent_bp integer not null default 0
    check (discount_percent_bp between 0 and 10000),
  -- Always stored, even in percent mode. The total a customer is holding must
  -- not depend on re-deriving a percentage: a rounding rule changed a year
  -- later would silently restate the document. The percentage is kept only so
  -- the PDF can print the label.
  discount_paise bigint not null default 0 check (discount_paise >= 0),

  taxable_paise bigint not null default 0 check (taxable_paise >= 0),
  tax_mode text not null default 'none'
    check (tax_mode in ('none', 'cgst_sgst', 'igst')),
  tax_rate_bp integer not null default 0 check (tax_rate_bp between 0 and 10000),
  cgst_paise bigint not null default 0 check (cgst_paise >= 0),
  sgst_paise bigint not null default 0 check (sgst_paise >= 0),
  igst_paise bigint not null default 0 check (igst_paise >= 0),
  round_off_paise bigint not null default 0,          -- may be negative
  total_paise bigint not null default 0 check (total_paise >= 0),
  amount_in_words text not null default '',

  -- String arrays. Prefilled from the picked package's features and editable
  -- from that moment on; exclusions starts empty because what a package leaves
  -- out is a sales judgement about this customer, not catalogue data.
  inclusions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  notes      text  not null default '',

  -- Same machinery as invoices: the terms a document states are the terms that
  -- were published when it was sent, so they are frozen on, not looked up.
  show_policies   boolean not null default true,
  policy_snapshot jsonb   not null default '[]'::jsonb,

  pdf_path text not null default '',
  -- Set when the customer says yes. Provenance only; nothing reads it to
  -- render. With invoices.source_quotation_id it answers the question the
  -- business will actually ask: what share of what we quote converts, and at
  -- what discount?
  converted_invoice_id uuid,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  -- The identity that makes the arithmetic checkable at the database level, and
  -- the same one computeInvoiceTotals guarantees. If the TypeScript is wrong the
  -- insert fails rather than a bad total reaching a customer.
  if not exists (select 1 from pg_constraint where conname = 'quotations_total_balances') then
    alter table public.quotations
      add constraint quotations_total_balances
      check (
        total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise + round_off_paise
      );
  end if;

  -- Which tax columns may be non-zero follows from the mode, not from whoever
  -- is typing. Copied from invoices_tax_mode_split.
  if not exists (select 1 from pg_constraint where conname = 'quotations_tax_mode_split') then
    alter table public.quotations
      add constraint quotations_tax_mode_split
      check (
        (tax_mode = 'none'      and cgst_paise = 0 and sgst_paise = 0 and igst_paise = 0)
        or (tax_mode = 'cgst_sgst' and igst_paise = 0)
        or (tax_mode = 'igst'      and cgst_paise = 0 and sgst_paise = 0)
      );
  end if;

  -- The three discount columns have to agree with each other, or the PDF prints
  -- a percentage that does not match the money beside it. Written as an OR chain
  -- rather than a CASE for the same reason as the tax split above: a CASE with no
  -- ELSE yields NULL for an unmatched mode, and a CHECK accepts NULL.
  --
  -- Note this does NOT require a percent-mode quotation to have a non-zero rate.
  -- A half-filled draft is allowed to be half-filled.
  if not exists (select 1 from pg_constraint where conname = 'quotations_discount_shape') then
    alter table public.quotations
      add constraint quotations_discount_shape
      check (
        (discount_mode = 'none' and discount_paise = 0 and discount_percent_bp = 0)
        or (discount_mode = 'amount' and discount_percent_bp = 0)
        or discount_mode = 'percent'
      );
  end if;

  -- A discount larger than the bill is a typo, not a credit. computeInvoiceTotals
  -- clamps it; this is the same clamp where it cannot be bypassed from a browser
  -- console, and it is what keeps taxable_paise non-negative.
  if not exists (select 1 from pg_constraint where conname = 'quotations_discount_within_subtotal') then
    alter table public.quotations
      add constraint quotations_discount_within_subtotal
      check (discount_paise <= subtotal_paise);
  end if;

  -- Anything past draft has been sent, and a sent quotation without a number is
  -- a document nobody can refer to.
  if not exists (select 1 from pg_constraint where conname = 'quotations_sent_has_number') then
    alter table public.quotations
      add constraint quotations_sent_has_number
      check (
        status = 'draft'
        or (number is not null and sent_on is not null and fy_label is not null)
      );
  end if;

  -- Lengths mirror the editor's maxLength attributes, which are the convenience
  -- copy of this. The number cap is 20 rather than the invoice's 16: no GST
  -- rule applies, and MTQ/26-27/0001 is fourteen characters anyway.
  if not exists (select 1 from pg_constraint where conname = 'quotations_text_len') then
    alter table public.quotations
      add constraint quotations_text_len
      check (
        char_length(number)              <= 20
        and char_length(customer_name)    <= 200
        and char_length(customer_phone)   <= 32
        and char_length(customer_email)   <= 200
        and char_length(customer_address) <= 500
        and char_length(customer_gstin)   <= 20
        and char_length(departure_city)   <= 120
        and char_length(notes)            <= 2000
        and char_length(declined_reason)  <= 500
      );
  end if;
end $$;

create index if not exists quotations_status_created_idx
  on public.quotations (status, created_at desc);

-- Partial, because "which live offers are about to go stale" is the only
-- question anyone asks of valid_until, and it is never asked of a draft.
create index if not exists quotations_valid_until_idx
  on public.quotations (valid_until)
  where status = 'sent';

create index if not exists quotations_trip_idx
  on public.quotations (trip_id)
  where trip_id is not null;

-- ---------------------------------------------------------------------------
-- quotation_items — invoice_items, minus the tax column, plus a note.
--
-- No sac_code: a quotation is not a tax document, and asking an admin for a
-- service accounting code on an offer that may never be accepted is friction
-- for nothing.
--
-- No package_id, and that is the whole of Decision 1. A line is a description,
-- a head count and a rate — all text and amounts, all editable. The catalogue
-- fills them in once, at the moment of picking, and is then out of the picture.
--
-- quantity is numeric(10,2) to match invoice_items exactly, even though pax is
-- a whole number in practice, so that converting to an invoice needs no
-- coercion. (It is also why computeLineTotal scales by 100 before multiplying.)
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  line_total_paise bigint not null check (line_total_paise >= 0),
  -- Which catalogue package this line was built from, as a note. NOT a foreign
  -- key and never joined: it survives the package being renamed, re-slugged or
  -- deleted, which is exactly the point. If it ever disagrees with description,
  -- description wins — description is what the customer was sent.
  source_package_slug text not null default '',
  sort_order integer not null default 0
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotation_items_text_len') then
    alter table public.quotation_items
      add constraint quotation_items_text_len
      check (
        char_length(description) between 1 and 500
        and char_length(source_package_slug) <= 200
      );
  end if;
end $$;

create index if not exists quotation_items_quotation_idx
  on public.quotation_items (quotation_id, sort_order);

-- ---------------------------------------------------------------------------
-- quotation_counters — its own series, not a shared one.
--
-- Same shape as invoice_counters and for the same concurrency reason. Separate,
-- because most quotations never become invoices and the two series must be free
-- to run at completely different rates.
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_counters (
  fy_label text primary key,
  next_seq integer not null default 1 check (next_seq >= 1)
);

-- ---------------------------------------------------------------------------
-- The two provenance links between a quotation and the invoice it became.
--
-- Added after both tables exist, because they point at each other. Both
-- nullable, both `on delete set null`: losing one document must not delete the
-- other, and must not block the delete either.
--
-- invoices.source_quotation_id is set when the draft is inserted, so it sits
-- OUTSIDE guard_issued_invoice()'s frozen sets — alongside pdf_path, trip_id
-- and paid_in_full, which are also later facts about the world rather than part
-- of the document's content. Nothing needs to change in that trigger; this
-- comment exists because a future reader will wonder whether it should.
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists source_quotation_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'invoices_source_quotation_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_source_quotation_id_fkey
      foreign key (source_quotation_id)
      references public.quotations (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotations_converted_invoice_id_fkey'
  ) then
    alter table public.quotations
      add constraint quotations_converted_invoice_id_fkey
      foreign key (converted_invoice_id)
      references public.invoices (id) on delete set null;
  end if;
end $$;

create index if not exists invoices_source_quotation_idx
  on public.invoices (source_quotation_id)
  where source_quotation_id is not null;

comment on column public.invoices.source_quotation_id is
  'The quotation this invoice was created from, if any. Provenance only — never '
  'read back to render. Set at draft insert, so it is deliberately not in '
  'guard_issued_invoice()''s frozen column sets.';

comment on column public.quotations.converted_invoice_id is
  'The invoice this quotation became, if any. Provenance only.';

-- ---------------------------------------------------------------------------
-- send_quotation() — allocate the number the first time, bump the revision
-- every time after.
--
-- Structurally issue_invoice() from 021, with one difference that is the whole
-- of the "a quotation stays editable" rule: CALLING THIS TWICE IS NOT AN ERROR.
-- The first call burns a number. Every call after it keeps that number, adds one
-- to revision, refreshes sent_on / valid_until and re-snapshots the policies.
--
-- That is what makes the storage path safe. src/lib/quotations.ts writes
-- revision N's PDF to `<id>/<number>-rN.pdf`, the quotations bucket has no
-- update policy, and so a seven-day signed link the customer is already holding
-- keeps resolving to the document they were actually sent — even after the
-- admin has edited the quotation and sent a cheaper one.
--
-- security definer because the counter table must be updated atomically by a
-- caller who is only allowed to see their own rows through RLS. The is_admin()
-- check is therefore the first statement, not an afterthought.
-- ---------------------------------------------------------------------------
create or replace function public.send_quotation(
  p_quotation  uuid,
  p_sent_on    date default current_date,
  p_valid_days integer default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_number text;
  v_show   boolean;
  v_fy     text;
  v_seq    integer;
  v_prefix text;
  v_days   integer;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select status, number, show_policies
    into v_status, v_number, v_show
    from public.quotations
   where id = p_quotation;

  if v_status is null then
    raise exception 'quotation % does not exist', p_quotation;
  end if;

  -- A quotation with no lines is a letterhead with a zero on it, and sending it
  -- would consume a number from the series.
  if not exists (select 1 from public.quotation_items where quotation_id = p_quotation) then
    raise exception 'quotation % has no line items', p_quotation;
  end if;

  select coalesce(p_valid_days, quote_validity_days, 7),
         coalesce(quote_prefix, 'MTQ')
    into v_days, v_prefix
    from public.business_profile
   where id = 1;

  v_days   := coalesce(v_days, 7);
  v_prefix := coalesce(v_prefix, 'MTQ');

  -- Only on the first send. A number, once allocated, is the name the customer
  -- knows this document by, and a second one would mean two names for one
  -- negotiation.
  if v_number is null then
    v_fy := public.fy_label(p_sent_on);

    insert into public.quotation_counters (fy_label, next_seq)
    values (v_fy, 1)
    on conflict (fy_label) do nothing;

    -- The row lock taken by this update is what serialises two admins sending
    -- at the same instant. Same mechanism as issue_invoice().
    update public.quotation_counters
       set next_seq = next_seq + 1
     where fy_label = v_fy
    returning next_seq - 1 into v_seq;

    v_number := v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, 4, '0');

    update public.quotations
       set number      = v_number,
           fy_label    = v_fy,
           seq         = v_seq,
           status      = 'sent',
           sent_on     = p_sent_on,
           sent_at     = timezone('utc', now()),
           valid_until = p_sent_on + v_days,
           policy_snapshot = case
             when coalesce(v_show, true) then public.invoice_policy_lists()
             else '[]'::jsonb
           end
     where id = p_quotation;
  else
    -- A re-send. New revision, new validity window, freshly snapshotted terms,
    -- and the status returns to 'sent' because an offer the customer had
    -- declined and we then re-sent is live again.
    update public.quotations
       set revision    = revision + 1,
           status      = 'sent',
           sent_on     = p_sent_on,
           sent_at     = timezone('utc', now()),
           valid_until = p_sent_on + v_days,
           accepted_on = null,
           policy_snapshot = case
             when coalesce(v_show, true) then public.invoice_policy_lists()
             else '[]'::jsonb
           end
     where id = p_quotation;
  end if;

  return v_number;
end;
$$;

revoke all on function public.send_quotation(uuid, date, integer) from public;
grant execute on function public.send_quotation(uuid, date, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- bump_quotation_revision() — the opposite of guard_issued_invoice().
--
-- That trigger exists to refuse edits. This one exists to permit them, and it
-- refuses exactly two things:
--
--   * The number, fy_label and seq, once a number has been allocated. Everything
--     else on a sent quotation is fair game, because negotiating is the point.
--   * A revision going backwards, which would let a new document be written over
--     an old document's path in the bucket.
--
-- It does not bump the revision itself: send_quotation() does that, because the
-- revision counts sends. Trying to detect a "material" edit here would need a
-- hand-maintained column list, would miss a description-only change made in
-- quotation_items, and would print revision numbers the customer never saw.
--
-- It also stamps updated_at, which is what the editor compares against sent_at
-- to tell the admin they have unsent changes. There is no companion guard on
-- quotation_items, deliberately: those rows stay editable for the life of the
-- quotation.
-- ---------------------------------------------------------------------------
create or replace function public.bump_quotation_revision()
returns trigger
language plpgsql
as $$
begin
  if old.number is not null then
    if (new.number, new.fy_label, new.seq)
       is distinct from
       (old.number, old.fy_label, old.seq)
    then
      raise exception 'the number of a sent quotation is fixed';
    end if;
  end if;

  -- Monotonic. A stale tab PATCHing an old revision back must not be able to
  -- redirect the next PDF write onto a file the customer already has.
  if new.revision < old.revision then
    new.revision := old.revision;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists quotations_bump_revision on public.quotations;
create trigger quotations_bump_revision
before update on public.quotations
for each row execute function public.bump_quotation_revision();

-- ---------------------------------------------------------------------------
-- quotation_overview — the list screen's source, and where expiry lives.
--
-- Whether an offer has expired is not a column, because it changes without
-- anyone writing a row. It is a comparison against today, and 018 already
-- settled where that comparison belongs: invoice_balances.is_overdue is
-- computed in SQL on purpose, because the browser's "today" is the viewer's
-- device clock.
--
-- 'expired' is therefore a fifth DISPLAY state over four stored ones — the same
-- shape as PAYMENT_STATUSES layering over INVOICE_STATUSES in
-- src/lib/finance.ts. isExpired() in src/lib/quotations.ts mirrors the
-- expression below for rows the editor already holds; the two are a pair, and if
-- one changes, both change.
-- ---------------------------------------------------------------------------
create or replace view public.quotation_overview as
select
  q.id,
  q.number,
  q.status,
  q.revision,
  q.customer_name,
  q.customer_phone,
  q.departure_city,
  q.pax,
  q.quote_date,
  q.sent_on,
  q.valid_until,
  q.subtotal_paise,
  q.discount_paise,
  q.total_paise,
  q.converted_invoice_id,
  q.pdf_path,
  q.created_at,
  q.updated_at,
  -- Only a live offer can go stale. A draft was never promised, and an accepted
  -- or declined quotation has already had its answer.
  (
    q.status = 'sent'
    and q.valid_until is not null
    and q.valid_until < current_date
  ) as is_expired
from public.quotations q;

-- Load-bearing, exactly as on invoice_balances: without it the view runs as its
-- owner and hands every row to any authenticated caller, RLS or not.
alter view public.quotation_overview set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Access. Admins only, in both directions, same loop as 017.
--
-- These rows are prices we are willing to accept and customers' contact
-- details. Nothing on the public site reads or writes any of it: per Decision 10
-- in docs/quotations.md there is no customer-facing accept link in v1, precisely
-- because that would be the first anonymous write path into a finance table and
-- is a security review rather than a feature. So there is no anon path to carve
-- out here.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'quotations', 'quotation_items', 'quotation_counters'
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
-- Storage — one more PRIVATE bucket.
--
-- Its own bucket rather than a quotations/ prefix inside `invoices`, because
-- storage policies are written per bucket_id. A shared bucket would need
-- path-matching policies to keep the two document sets apart — more fragile, for
-- no gain.
--
-- Reached through short-lived signed URLs, which is also what makes it sendable
-- over WhatsApp: a wa.me link cannot carry an attachment, but it can carry a
-- link that expires.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quotations', 'quotations', false, 8388608,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "Admins read quotation pdfs" on storage.objects;
create policy "Admins read quotation pdfs"
on storage.objects for select
to authenticated
using (bucket_id = 'quotations' and public.is_admin());

drop policy if exists "Admins upload quotation pdfs" on storage.objects;
create policy "Admins upload quotation pdfs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'quotations' and public.is_admin());

-- Deliberately no update policy, for the same reason the invoices bucket has
-- none. Revision N's PDF is the document the customer was sent; a later
-- revision writes a new object beside it rather than replacing it, and this
-- application should not be able to perform the replacement at all. It is also
-- what makes uploadPdfOnce()'s "already exists means this IS that document"
-- reasoning sound.
drop policy if exists "Admins update quotation pdfs" on storage.objects;

drop policy if exists "Admins delete quotation pdfs" on storage.objects;
create policy "Admins delete quotation pdfs"
on storage.objects for delete
to authenticated
using (bucket_id = 'quotations' and public.is_admin());
