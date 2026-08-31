-- ============================================================================
-- Reporting: per-departure P&L, month-by-month, and spend by category.
--
-- This is the migration the whole system was shaped for. 017 put a nullable
-- trip_id on both expenses and invoices before either had a UI, precisely so
-- that this could be three views rather than a backfill across a year of live
-- financial rows.
--
-- All three aggregate in the DATABASE rather than in the browser. The expenses
-- screen gets away with client-side totals because a period bounds it; a P&L
-- does not — "every invoice and every expense ever, grouped" is exactly the
-- shape that should never be shipped to a phone to add up.
--
-- Two rules run through all of them:
--
--   * REVENUE MEANS ISSUED. A draft is not a bill and a cancelled invoice is
--     not revenue, so both are excluded everywhere below. Counting drafts would
--     let an abandoned quote inflate a departure's margin.
--   * DELETED EXPENSES ARE GONE. `deleted_at is null` throughout, matching what
--     the expenses list shows, so a total here can always be reconciled against
--     that screen.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- trip_financials — did that departure make money?
--
-- Three separate subqueries rather than one join chain: joining invoices and
-- expenses to trips in a single statement multiplies the rows (five invoices
-- and four expenses would produce twenty), and the sums come out silently
-- wrong. Aggregating each side first and then joining the results keeps every
-- figure the sum of its own table.
-- ---------------------------------------------------------------------------
create or replace view public.trip_financials as
select
  t.id                                                as trip_id,
  t.name,
  t.category,
  t.departure_date,
  t.return_date,
  t.status,
  coalesce(inv.invoiced_paise, 0)                     as invoiced_paise,
  coalesce(inv.invoice_count, 0)                      as invoice_count,
  coalesce(pay.received_paise, 0)                     as received_paise,
  coalesce(inv.invoiced_paise, 0)
    - coalesce(pay.received_paise, 0)                 as outstanding_paise,
  coalesce(exp.spent_paise, 0)                        as spent_paise,
  coalesce(exp.expense_count, 0)                      as expense_count,
  -- Margin is billed minus spent, not received minus spent: a departure that
  -- has run either made money or did not, regardless of who has paid up yet.
  -- Cash position is the outstanding column, kept separate on purpose.
  coalesce(inv.invoiced_paise, 0)
    - coalesce(exp.spent_paise, 0)                    as margin_paise
from public.trips t

left join (
  select trip_id,
         sum(total_paise) as invoiced_paise,
         count(*)         as invoice_count
  from public.invoices
  where status = 'issued' and trip_id is not null
  group by trip_id
) inv on inv.trip_id = t.id

left join (
  select i.trip_id,
         sum(p.amount_paise) as received_paise
  from public.invoice_payments p
  join public.invoices i on i.id = p.invoice_id
  where i.status = 'issued' and i.trip_id is not null
  group by i.trip_id
) pay on pay.trip_id = t.id

left join (
  select trip_id,
         sum(amount_paise) as spent_paise,
         count(*)          as expense_count
  from public.expenses
  where deleted_at is null and trip_id is not null
  group by trip_id
) exp on exp.trip_id = t.id;

alter view public.trip_financials set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- finance_monthly — money in and money out, by month.
--
-- A union rather than a join, because the three facts live on different dates:
-- an invoice belongs to its issue_date, a payment to the day it was received,
-- an expense to the day it was spent. A month with only expenses and no
-- invoices still has to appear, and a full outer join over three tables to get
-- that is far harder to read than summing a union of zero-padded rows.
-- ---------------------------------------------------------------------------
create or replace view public.finance_monthly as
with facts as (
  select date_trunc('month', issue_date)::date as month,
         total_paise                           as invoiced_paise,
         0::bigint                             as received_paise,
         0::bigint                             as spent_paise,
         1                                     as invoice_count,
         0                                     as expense_count
  from public.invoices
  where status = 'issued' and issue_date is not null

  union all

  select date_trunc('month', p.paid_on)::date, 0, p.amount_paise, 0, 0, 0
  from public.invoice_payments p
  join public.invoices i on i.id = p.invoice_id
  where i.status = 'issued'

  union all

  select date_trunc('month', spent_on)::date, 0, 0, amount_paise, 0, 1
  from public.expenses
  where deleted_at is null
)
select
  month,
  sum(invoiced_paise)::bigint                    as invoiced_paise,
  sum(received_paise)::bigint                    as received_paise,
  sum(spent_paise)::bigint                       as spent_paise,
  (sum(invoiced_paise) - sum(spent_paise))::bigint as margin_paise,
  sum(invoice_count)::bigint                     as invoice_count,
  sum(expense_count)::bigint                     as expense_count
from facts
group by month;

alter view public.finance_monthly set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- expense_category_totals — where the money went, per month.
--
-- Carries `kind` so a report can separate what a departure should bear from
-- what the business bears regardless. Without that split, per-trip margin and
-- total spend cannot both be right on the same screen.
-- ---------------------------------------------------------------------------
create or replace view public.expense_category_totals as
select
  date_trunc('month', e.spent_on)::date as month,
  c.id                                  as category_id,
  c.name                                as category_name,
  c.kind                                as category_kind,
  sum(e.amount_paise)::bigint           as spent_paise,
  count(*)::bigint                      as expense_count
from public.expenses e
join public.expense_categories c on c.id = e.category_id
where e.deleted_at is null
group by 1, 2, 3, 4;

alter view public.expense_category_totals set (security_invoker = on);
