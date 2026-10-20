-- ============================================================================
-- Flight details on quotations and invoices, and a per-person discount on
-- quotations.
--
-- Two requests from the counter, in one migration because they ship together:
--
--   1. "₹2,000 off per person" is how a concession is usually offered, and for
--      eight travellers it is ₹16,000. Until now the admin worked that out by
--      hand and typed it into the flat-amount box, which stored the right total
--      and threw away the promise the customer was actually given.
--
--   2. The flights. They arrive as a block pasted from the airline or a
--      ticketing agent —
--
--        Saudi Airline
--        SV 771  BOM-JED 26Dec 11:00 - 14:15
--        SV 770 JED - BOM 09Jan 2:10 - 09:25
--
--      — and, just as often, they have not arrived yet. Neither document had
--      anywhere to put them, so they went into notes, or nowhere.
--
-- Nothing here is required, and every default renders as "say nothing", for
-- the reason 025 gives: a quotation or invoice nobody has filled these in on
-- must produce exactly the document it produced before they existed.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The per-person discount (quotations only).
--
-- Stored as a RATE beside the existing discount columns, not as a second
-- total. discount_paise stays the single figure computeInvoiceTotals subtracts
-- before tax — it is now the per-person part (rate x pax) plus the whole-quote
-- part, clamped to the subtotal — and every constraint and view that already
-- reads it keeps meaning what it meant. The rate is here so the PDF can print
-- "₹2,000 x 8 = ₹16,000", which is the line the customer checks.
--
-- Rejected: a fourth discount_mode, 'per_person'. The request is per-person
-- discount ALONG WITH the other one — "five percent, and two thousand a head
-- for the children" — and a mode is one-or-the-other by construction.
--
-- Rejected: storing the per-person total. It would be derivable from the rate
-- and pax, and two stored figures that can disagree are how a PDF and a
-- database end up quoting different discounts. splitStoredDiscount() in
-- src/lib/quotations.ts recovers the two lines from discount_paise, the rate
-- and pax, all stored.
--
-- Invoices do not get one. An invoice has a single typed discount (Decision 4
-- of the finance doc), and a quotation converts into it as the resolved total
-- — the customer accepted a number, and the invoice states that number.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists discount_per_person_paise bigint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotations_discount_per_person_nonneg') then
    alter table public.quotations
      add constraint quotations_discount_per_person_nonneg
      check (discount_per_person_paise >= 0);
  end if;
end $$;

-- quotations_discount_shape (024) required discount_paise = 0 under mode
-- 'none'. With a per-person discount and no whole-quote one, the stored total
-- is the per-person part alone, so that clause is widened to allow exactly
-- that: a non-zero total in mode 'none' only when a per-person rate explains
-- it. A CHECK cannot be altered in place, so it is dropped and recreated;
-- every existing row satisfies the wider rule, because every existing rate is
-- the default 0.
alter table public.quotations
  drop constraint if exists quotations_discount_shape;

alter table public.quotations
  add constraint quotations_discount_shape
  check (
    (discount_mode = 'none' and discount_percent_bp = 0
      and (discount_paise = 0 or discount_per_person_paise > 0))
    or (discount_mode = 'amount' and discount_percent_bp = 0)
    or discount_mode = 'percent'
  );

-- ---------------------------------------------------------------------------
-- 2. Flights, on both documents.
--
-- jsonb on the row, an array of legs:
--
--   [{ "airline": "Saudi Airline", "flight_no": "SV 771",
--      "from": "BOM", "to": "JED", "date": "26Dec",
--      "departs": "11:00", "arrives": "14:15" }]
--
-- Not a child table, for 025's reason about accommodation: two or four rows,
-- written once, read only by the renderer, never filtered or joined. And not a
-- join to anything, for Decision 1's reason: a schedule change in November must
-- not restate an offer made in April.
--
-- Every field is text. The date is picked on a calendar and arrives as
-- YYYY-MM-DD, but it stays text inside the json rather than being checked as a
-- `date`: a pasted "26Dec" the editor could not read is kept as typed and
-- printed as typed, which beats refusing the save. Nothing sorts or compares
-- these. Airline is per leg because a return on a different carrier is a real
-- booking.
--
-- The shape is checked lightly: an array of at most eight objects (more is a
-- pasted group manifest, not a booking), and the text kept to a size a
-- printed row can hold. The keys inside are not enforced — a missing key
-- renders as a blank cell, which is the right failure.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists flights jsonb not null default '[]'::jsonb;

alter table public.invoices
  add column if not exists flights jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- Baggage, once per document.
--
--   { "checkin_kg": 20, "checkin_pieces": 2, "cabin_kg": 7, "cabin_pieces": 1 }
--
-- Not per leg: the ticket states one allowance for the booking, and the agent
-- sends it as one line ("Check in Baggage 20Kg x 2pc . Cabin Bag 07Kg x 1pc").
-- Numbers rather than that sentence, so every document prints it the same way
-- ("Check-in 20 kg x 2 pc"). A missing key, or null, is "not stated" and prints
-- nothing; '{}' is the default for the same reason '[]' is above.
--
-- A sibling column rather than a key inside `flights`, because `flights` is an
-- array of legs and an allowance is not a leg.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists baggage jsonb not null default '{}'::jsonb;

alter table public.invoices
  add column if not exists baggage jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotations_flights_shape') then
    alter table public.quotations
      add constraint quotations_flights_shape
      check (
        jsonb_typeof(flights) = 'array'
        and jsonb_array_length(flights) <= 8
        and length(flights::text) <= 4000
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_flights_shape') then
    alter table public.invoices
      add constraint invoices_flights_shape
      check (
        jsonb_typeof(flights) = 'array'
        and jsonb_array_length(flights) <= 8
        and length(flights::text) <= 4000
      );
  end if;

  -- An object, and small. The numbers inside are bounded by the editor (two
  -- digits each); here only the shape and the size, so a stray key added later
  -- does not need a migration.
  if not exists (select 1 from pg_constraint where conname = 'quotations_baggage_shape') then
    alter table public.quotations
      add constraint quotations_baggage_shape
      check (jsonb_typeof(baggage) = 'object' and length(baggage::text) <= 400);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_baggage_shape') then
    alter table public.invoices
      add constraint invoices_baggage_shape
      check (jsonb_typeof(baggage) = 'object' and length(baggage::text) <= 400);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Freeze an issued invoice's flights and baggage.
--
-- They print on the document, and the rule for an issued invoice is that what
-- the customer was sent is a historical fact. The editor already goes
-- read-only at issue; without this a stray PATCH could still rewrite them.
--
-- A rescheduled flight after issue is therefore a cancel-and-reissue, like any
-- other change to an issued bill. That is deliberate: the paid-in-full copy of
-- an invoice is rebuilt from this row (invoicePdfPath), and it must not quietly
-- carry different flights from the one the customer first received.
--
-- The function is 021's, verbatim, with the flights block added at the end of
-- the issued branch. No later migration redefines it.
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

    if (new.policy_snapshot, new.show_policies)
       is distinct from
       (old.policy_snapshot, old.show_policies)
    then
      raise exception 'the policies printed on an issued invoice cannot be changed; cancel and reissue';
    end if;

    if (new.flights, new.baggage) is distinct from (old.flights, old.baggage) then
      raise exception 'the flights on an issued invoice cannot be changed; cancel and reissue';
    end if;
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'a cancelled invoice cannot be reopened';
  end if;

  return new;
end;
$$;

-- send_quotation() and issue_invoice() are deliberately NOT touched. Neither
-- column takes part in numbering or snapshotting: on a quotation they are
-- content and stay editable after sending (Decision 2 of 024), and on an
-- invoice the guard above is what freezes them.
