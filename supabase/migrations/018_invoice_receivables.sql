-- ============================================================================
-- Receivables, plus two fixes to 017 found while verifying it.
--
-- 017 created public.invoice_balances with just enough to show a payment badge
-- on one invoice. The list screen needs more than that: "what is still owed",
-- "what is overdue", and both without fetching every invoice to work it out in
-- the browser.
--
-- So the view grows the few invoice columns a receivables list actually reads,
-- plus is_overdue.
--
-- On is_overdue being computed HERE rather than in the client: overdue is a
-- fact about today, and the browser's today is whatever the viewer's device
-- says it is. An admin whose laptop clock is a day out, or who is travelling,
-- would otherwise see a different answer from the one the database would give.
-- Comparing against current_date settles it in one place.
--
-- `create or replace view` may only APPEND columns, never reorder or retype the
-- existing ones — which is why the first five below are byte-identical to 017.
--
-- Safe to run more than once.
-- ============================================================================

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
  end                                              as payment_status,

  -- Appended in 018.
  i.status                                         as invoice_status,
  i.number,
  i.customer_name,
  i.customer_phone,
  i.issue_date,
  i.due_date,
  (
    i.status = 'issued'
    and i.due_date is not null
    and i.due_date < current_date
    and i.total_paise - coalesce(sum(p.amount_paise), 0) > 0
  )                                                as is_overdue,
  max(p.paid_on)                                   as last_payment_on
from public.invoices i
left join public.invoice_payments p on p.invoice_id = i.id
group by i.id;

-- Re-asserted rather than assumed: without it the view runs with its owner's
-- rights and would hand every invoice to any authenticated user, bypassing the
-- admin-only policies on the tables underneath.
alter view public.invoice_balances set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- FIX 1: an issued invoice could still be DELETED.
--
-- 017 guards UPDATE on invoices and INSERT/UPDATE/DELETE on invoice_items, but
-- nothing guards DELETE on the invoice itself, and the RLS policy is FOR ALL.
-- So the number, the amounts and the customer were all immutable while the
-- whole row could simply be removed.
--
-- That defeats the point of burning a number on cancellation. A cancelled
-- invoice leaves a numbered row explaining itself; a deleted one leaves a gap
-- in a series that is required to be consecutive, with nothing to say why. The
-- gap is exactly what an auditor asks about.
--
-- Drafts are still deletable — they were never numbered, so they leave no hole.
-- ---------------------------------------------------------------------------
create or replace function public.guard_invoice_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' then
    raise exception
      'invoice % is % and cannot be deleted; cancel it instead so the number stays accounted for',
      coalesce(old.number, old.id::text), old.status;
  end if;
  return old;
end;
$$;

drop trigger if exists invoices_guard_delete on public.invoices;
create trigger invoices_guard_delete
before delete on public.invoices
for each row execute function public.guard_invoice_delete();

-- ---------------------------------------------------------------------------
-- FIX 2: "the line items of a issued invoice" — grammar, in a message an admin
-- actually sees when they try to edit a locked invoice.
-- ---------------------------------------------------------------------------
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
    raise exception 'the line items of an % invoice cannot be changed', v_status;
  end if;

  return coalesce(new, old);
end;
$$;
