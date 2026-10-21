-- ============================================================================
-- Reissuing an invoice: the correction carries the payments with it.
--
-- The situation, from the counter: an issued invoice has a mistake and five
-- receipts against it. An issued invoice cannot be edited (017, Decision 3 of
-- docs/finance-expenses-and-invoicing.md), so the fix is cancel and reissue —
-- and "Duplicate as draft" copies the bill but not the money. Payments belong
-- to the invoice they were recorded on, and 023 makes `invoice_id` on a payment
-- immutable, so the admin had to remove five payments, cancel, issue the copy
-- and type the five in again — in that order, because a cancelled invoice
-- takes no payment changes in the UI. Get the order wrong and the money is
-- counted on two invoices.
--
-- So a draft may name the invoice it REPLACES, and issuing it does the rest in
-- the same transaction as issue_invoice():
--
--   1. every payment on the old invoice is recorded again on the new one —
--      same date, amount, method and reference, in the order they were
--      received — and gets a NEW receipt number under the new invoice. The
--      payment's notes say which receipt it was, so the trail survives;
--   2. the old payments are removed;
--   3. the old invoice is cancelled "Reissued as <new number>", if it was not
--      cancelled already.
--
-- Decisions, with what was rejected:
--
--   * RE-RECORD, NOT MOVE. Updating `invoice_id` on the payment would keep the
--     old receipt number (MT/26-27/0041-R2) pointing at the new invoice
--     (…/0042), and paid_before_paise — snapshotted against the old total —
--     would be wrong for the new one. 023's rule stands: a payment is fixed;
--     a wrong one is removed and recorded again with a new number.
--
--   * IN THE DATABASE, ON ISSUE. Not a sequence of calls from the browser:
--     there is no client transaction, and a tab closed between "record on the
--     new one" and "remove from the old one" double-counts lakhs. Not at draft
--     creation either: the customer's invoice must stand, with its payments,
--     until the replacement actually exists with a number.
--
--   * A CANCELLED INVOICE CAN BE REPLACED TOO. The admin who already cancelled
--     before reissuing (the case that prompted this) has payments stranded on
--     a cancelled invoice. Replacing it moves them; it is simply not cancelled
--     a second time.
--
--   * ONE REPLACEMENT PER INVOICE. A unique index: two drafts both claiming the
--     same invoice would race for its payments. Deleting the draft frees it.
--
-- Old receipt PDFs stay in storage (no update or delete policy on the bucket),
-- so a link a customer already holds keeps opening what they were sent.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.invoices
  add column if not exists replaces_invoice_id uuid
    references public.invoices (id) on delete restrict;

comment on column public.invoices.replaces_invoice_id is
  'The invoice this one corrects. On issue, its payments are re-recorded here and it is cancelled. Set only on a draft.';

create unique index if not exists invoices_replaces_invoice_id_key
on public.invoices (replaces_invoice_id)
where replaces_invoice_id is not null;

-- ---------------------------------------------------------------------------
-- What a draft may claim to replace, and that the claim is fixed once issued.
-- ---------------------------------------------------------------------------
create or replace function public.guard_invoice_replaces()
returns trigger
language plpgsql
as $$
declare
  v_target_status text;
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'draft'
       and new.replaces_invoice_id is distinct from old.replaces_invoice_id
    then
      raise exception 'which invoice this one replaces is fixed once it is issued';
    end if;
  end if;

  if new.replaces_invoice_id is not null
     and (tg_op = 'INSERT' or new.replaces_invoice_id is distinct from old.replaces_invoice_id)
  then
    if new.status <> 'draft' then
      raise exception 'only a draft can be set to replace another invoice';
    end if;
    if new.replaces_invoice_id = new.id then
      raise exception 'an invoice cannot replace itself';
    end if;

    select status into v_target_status
      from public.invoices
     where id = new.replaces_invoice_id;

    if v_target_status is null then
      raise exception 'invoice % does not exist', new.replaces_invoice_id;
    end if;
    if v_target_status = 'draft' then
      raise exception 'a draft has no number to replace; edit it instead';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_guard_replaces on public.invoices;
create trigger invoices_guard_replaces
before insert or update of replaces_invoice_id, status on public.invoices
for each row execute function public.guard_invoice_replaces();

-- ---------------------------------------------------------------------------
-- On issue: carry the payments over and cancel what this replaces.
--
-- AFTER UPDATE, so it runs inside issue_invoice()'s transaction with the new
-- number already on the row — assign_payment_receipt() reads it to number the
-- receipts, and refuses anything not 'issued', which by now this row is. If any
-- step fails, the issue fails with it and nothing is half-done.
-- ---------------------------------------------------------------------------
create or replace function public.complete_invoice_reissue()
returns trigger
language plpgsql
as $$
declare
  v_old public.invoices%rowtype;
  v_payment public.invoice_payments%rowtype;
  v_note text;
begin
  select * into v_old
    from public.invoices
   where id = new.replaces_invoice_id
     for update;

  if v_old.id is null then
    raise exception 'invoice % does not exist', new.replaces_invoice_id;
  end if;
  if v_old.status not in ('issued', 'cancelled') then
    raise exception 'invoice % is % and cannot be replaced', v_old.id, v_old.status;
  end if;

  -- The order they were received, so R1 here is R1 there and each new
  -- receipt's "due before" (snapshotted on insert by 023) reads in sequence.
  for v_payment in
    select *
      from public.invoice_payments
     where invoice_id = v_old.id
     order by receipt_seq nulls first, paid_on, created_at
  loop
    v_note := 'Moved from '
      || coalesce(v_payment.receipt_number, 'invoice ' || coalesce(v_old.number, ''))
      || ' on reissue.';
    insert into public.invoice_payments (
      invoice_id, paid_on, amount_paise, method, reference, notes, created_by
    ) values (
      new.id,
      v_payment.paid_on,
      v_payment.amount_paise,
      v_payment.method,
      v_payment.reference,
      left(trim(both ' ' from v_note || ' ' || v_payment.notes), 1000),
      v_payment.created_by
    );
  end loop;

  delete from public.invoice_payments where invoice_id = v_old.id;

  if v_old.status = 'issued' then
    update public.invoices
       set status        = 'cancelled',
           cancelled_at  = timezone('utc', now()),
           cancel_reason = 'Reissued as ' || new.number,
           updated_at    = timezone('utc', now())
     where id = v_old.id;
  end if;

  return null;
end;
$$;

drop trigger if exists invoices_complete_reissue on public.invoices;
create trigger invoices_complete_reissue
after update of status on public.invoices
for each row
when (old.status = 'draft' and new.status = 'issued' and new.replaces_invoice_id is not null)
execute function public.complete_invoice_reissue();
