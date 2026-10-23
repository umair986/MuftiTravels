-- ============================================================================
-- An invoice may not be issued unless its lines add up to its subtotal.
--
-- What happened: an invoice was issued with a subtotal larger than its printed
-- lines. The editor computed the totals over every line on screen, including
-- one with a rate but no description, while save() only stores lines that have
-- a description. That line was counted into subtotal_paise and total_paise and
-- never written to invoice_items — and the PDF printed a subtotal its own rows
-- contradict.
--
-- 017's invoices_total_balances proves total = taxable + tax + round-off, but
-- nothing tied subtotal_paise to the lines, so the browser's arithmetic was
-- trusted at exactly the one link that broke. The editor is fixed too; this is
-- the rule that holds when the editor is wrong next time.
--
-- Decisions, with what was rejected:
--
--   * ON ISSUE, NOT ON EVERY WRITE. A draft is saved in two requests — the
--     invoice row, then its lines — with no client transaction between them,
--     so a draft is legitimately out of step for a moment. Issue is when the
--     numbers become a document, and after it 017/018 freeze both sides.
--
--   * A TRIGGER, NOT A CHANGE TO issue_invoice(). The trigger catches the
--     draft -> issued transition however it is reached, and leaves 021's
--     function alone.
--
--   * taxable = subtotal - discount is checked at the same moment, because it
--     is the other unchecked step between the lines and the total.
--
-- Existing issued invoices are not touched: they are historical fact. One
-- that is wrong is fixed with "Reissue with corrections" (034).
--
-- Safe to run more than once.
-- ============================================================================

create or replace function public.guard_invoice_lines_match()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lines bigint;
begin
  if old.status = 'draft' and new.status = 'issued' then
    select coalesce(sum(line_total_paise), 0)
      into v_lines
      from public.invoice_items
     where invoice_id = new.id;

    if v_lines <> new.subtotal_paise then
      raise exception
        'invoice lines add up to % paise but the subtotal is % paise; save the draft again before issuing',
        v_lines, new.subtotal_paise;
    end if;

    if new.taxable_paise <> new.subtotal_paise - new.discount_paise then
      raise exception
        'taxable amount % paise is not subtotal % less discount % paise',
        new.taxable_paise, new.subtotal_paise, new.discount_paise;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_guard_lines_match on public.invoices;
create trigger invoices_guard_lines_match
before update on public.invoices
for each row execute function public.guard_invoice_lines_match();
