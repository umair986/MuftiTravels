-- ============================================================================
-- One numbered receipt per payment, and an invoice that settles itself.
--
-- The workflow this replaces had two overlapping documents: the invoice (paid
-- or pending, ticked by hand) and a single "receipt" that reprinted the whole
-- invoice plus every payment. On a settled bill the receipt was the more
-- complete of the two, which is backwards. Now:
--
--   * The INVOICE is issued at booking and says "Payment pending". When the
--     receipts add up to the total it is re-rendered — same number, a new file
--     beside the old one — listing every receipt and a zero balance. That is
--     the final statement, not a second invoice, so revenue is never counted
--     twice.
--   * Each PAYMENT gets its own short RECEIPT: what was due before it, what was
--     received, what is due after. Numbered from the invoice it belongs to:
--     MT/26-27/0003-R1, -R2, ... A 2-letter prefix keeps R1-R9 within GST's
--     16-character cap on document numbers.
--
-- What this migration makes true in the database, since the browser is not
-- the security boundary (see docs/security-audit.md):
--
--   1. A payment can only be recorded against an ISSUED invoice. The UI only
--      ever offered that; now it is enforced.
--   2. The receipt number is allocated here, under a row lock on the invoice,
--      so two admins recording at once cannot receive the same one. A
--      per-invoice counter rather than max(seq)+1, so removing the last
--      payment never hands its number to the next one — a customer may already
--      hold a receipt with that number on it.
--   3. `paid_before_paise` is SNAPSHOTTED at insert. The receipt prints "due
--      before this payment" from it, so the document renders the same in a
--      year even if an earlier payment is later removed. Rejected: deriving it
--      from the ledger at render time, which would silently rewrite what an
--      old receipt says.
--   4. A recorded payment is immutable apart from its notes. It has a receipt
--      the customer may already hold; a wrong entry is removed and re-recorded
--      (and gets a new number), it is not edited in place.
--   5. `invoices.paid_in_full` follows the ledger — true exactly when
--      something was received and the receipts cover the total. It stays a
--      stored column (the PDF path and the list read it) but the app no longer
--      ticks it by hand. Invoices ticked by hand before this migration, with
--      no payments recorded, are left as they are.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.invoice_payments
  add column if not exists receipt_seq integer,
  add column if not exists receipt_number text,
  add column if not exists paid_before_paise bigint;

alter table public.invoices
  add column if not exists receipt_counter integer not null default 0;

comment on column public.invoice_payments.receipt_number is
  'Printed receipt number, <invoice number>-R<seq>. Allocated by '
  'assign_payment_receipt(); never reused, never edited.';
comment on column public.invoice_payments.paid_before_paise is
  'Sum of the payments already recorded against the invoice when this one was '
  'inserted. Frozen, so the receipt''s "due before" never changes.';
comment on column public.invoices.receipt_counter is
  'Last receipt sequence handed out for this invoice. Only ever increases.';

-- Dropped up front so the backfill below is not refused by the immutability
-- trigger on a re-run, and recreated at the end.
drop trigger if exists invoice_payments_assign_receipt on public.invoice_payments;
drop trigger if exists invoice_payments_guard_update on public.invoice_payments;
drop trigger if exists invoice_payments_sync_paid on public.invoice_payments;
drop trigger if exists invoices_guard_receipt_counter on public.invoices;

-- ---------------------------------------------------------------------------
-- Backfill: number the payments that already exist, oldest first, and
-- snapshot what had been paid before each. These never had a numbered receipt
-- sent, so numbering them now takes nothing away from anybody.
-- ---------------------------------------------------------------------------
with ordered as (
  select
    p.id,
    row_number() over w as seq,
    coalesce(sum(p.amount_paise) over (w rows between unbounded preceding and 1 preceding), 0) as before,
    i.number
  from public.invoice_payments p
  join public.invoices i on i.id = p.invoice_id
  window w as (partition by p.invoice_id order by p.paid_on, p.created_at, p.id)
)
update public.invoice_payments p
   set receipt_seq       = o.seq,
       receipt_number    = case when o.number is null then null
                                else o.number || '-R' || o.seq end,
       paid_before_paise = o.before
  from ordered o
 where o.id = p.id
   and p.receipt_seq is null;

update public.invoices i
   set receipt_counter = s.max_seq
  from (
    select invoice_id, max(receipt_seq) as max_seq
    from public.invoice_payments
    group by invoice_id
  ) s
 where s.invoice_id = i.id
   and i.receipt_counter < s.max_seq;

-- Settled by the ledger -> paid. Never the other way round here: an invoice
-- ticked paid by hand with nothing recorded keeps what it already says.
update public.invoices i
   set paid_in_full = true
  from public.invoice_balances b
 where b.id = i.id
   and b.paid_paise > 0
   and b.balance_paise <= 0
   and not i.paid_in_full;

create unique index if not exists invoice_payments_receipt_seq_key
on public.invoice_payments (invoice_id, receipt_seq);

create unique index if not exists invoice_payments_receipt_number_key
on public.invoice_payments (receipt_number)
where receipt_number is not null;

-- ---------------------------------------------------------------------------
-- Allocate the receipt on insert. Whatever the client sent for these three
-- columns is overwritten.
-- ---------------------------------------------------------------------------
create or replace function public.assign_payment_receipt()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_number text;
  v_seq integer;
begin
  -- FOR UPDATE serialises concurrent inserts against the same invoice: the
  -- second waits, then reads the counter the first one wrote.
  select status, number, receipt_counter + 1
    into v_status, v_number, v_seq
    from public.invoices
   where id = new.invoice_id
     for update;

  if v_status is null then
    raise exception 'invoice % does not exist', new.invoice_id;
  end if;

  if v_status <> 'issued' then
    raise exception 'payments can only be recorded against an issued invoice (this one is %)', v_status;
  end if;

  update public.invoices
     set receipt_counter = v_seq
   where id = new.invoice_id;

  new.receipt_seq := v_seq;
  new.receipt_number := v_number || '-R' || v_seq;
  select coalesce(sum(amount_paise), 0)
    into new.paid_before_paise
    from public.invoice_payments
   where invoice_id = new.invoice_id;

  return new;
end;
$$;

create trigger invoice_payments_assign_receipt
before insert on public.invoice_payments
for each row execute function public.assign_payment_receipt();

-- ---------------------------------------------------------------------------
-- A recorded payment is fixed. Notes stay editable: they never print.
-- ---------------------------------------------------------------------------
create or replace function public.guard_invoice_payment_update()
returns trigger
language plpgsql
as $$
begin
  if (new.invoice_id, new.paid_on, new.amount_paise, new.method, new.reference,
      new.receipt_seq, new.receipt_number, new.paid_before_paise)
     is distinct from
     (old.invoice_id, old.paid_on, old.amount_paise, old.method, old.reference,
      old.receipt_seq, old.receipt_number, old.paid_before_paise)
  then
    raise exception 'a recorded payment cannot be changed; remove it and record it again';
  end if;
  return new;
end;
$$;

create trigger invoice_payments_guard_update
before update on public.invoice_payments
for each row execute function public.guard_invoice_payment_update();

-- The counter only moves forward, or a PATCH could hand out a number twice.
-- The unique index above is the backstop; this gives the clearer error.
create or replace function public.guard_invoice_receipt_counter()
returns trigger
language plpgsql
as $$
begin
  if new.receipt_counter < old.receipt_counter then
    raise exception 'receipt numbers are never reused';
  end if;
  return new;
end;
$$;

create trigger invoices_guard_receipt_counter
before update of receipt_counter on public.invoices
for each row execute function public.guard_invoice_receipt_counter();

-- ---------------------------------------------------------------------------
-- Keep paid_in_full in step with the ledger.
--
-- Not added to guard_issued_invoice()'s frozen set, for the reason migration
-- 022 gives: whether the money arrived is a later fact, not document content.
-- The PDF itself is rebuilt by the browser, which is the only thing that can
-- render it; this just makes the flag it keys off impossible to get wrong.
-- ---------------------------------------------------------------------------
create or replace function public.sync_invoice_paid_flag()
returns trigger
language plpgsql
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i
     set paid_in_full = (s.paid > 0 and s.paid >= i.total_paise)
    from (
      select coalesce(sum(amount_paise), 0) as paid
      from public.invoice_payments
      where invoice_id = v_invoice
    ) s
   where i.id = v_invoice
     and i.paid_in_full is distinct from (s.paid > 0 and s.paid >= i.total_paise);
  return null;
end;
$$;

create trigger invoice_payments_sync_paid
after insert or delete on public.invoice_payments
for each row execute function public.sync_invoice_paid_flag();
