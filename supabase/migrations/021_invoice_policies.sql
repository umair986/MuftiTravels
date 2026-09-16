-- ============================================================================
-- Policies and important notes on the invoice.
--
-- The payment policy, the cancellation policy and the travel notes already
-- exist once, in site_content_lists (migration 011), and every package page
-- renders them. A customer who receives a bill should be holding the same
-- terms, because the bill is the document they keep — not the web page they
-- looked at in March.
--
-- So the invoice carries them, and it carries them as a SNAPSHOT.
--
-- The alternative — reading site_content_lists at render time — would mean an
-- edit in the dashboard silently rewrites the cancellation terms attached to
-- every invoice ever issued, including ones already in dispute. The whole
-- point of 017's immutability triggers is that an issued invoice is a
-- historical fact; the policy text is part of that fact, so it is frozen with
-- the rest of it at the moment the number is burned.
--
-- Drafts have no snapshot yet and render the live lists, which is what makes
-- the preview show what issuing is about to freeze.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns.
--
-- policy_snapshot is [{ "title": "...", "items": ["...", ...] }, ...] — the
-- shape the PDF draws, not a copy of the table. Storing the rendered shape
-- means a later change to how site_content_lists is organised cannot make an
-- old invoice unprintable.
--
-- show_policies exists because not every invoice is a package. A standalone
-- visa fee or a ticket reissue has no business carrying nine clauses about
-- departure dates, and an admin who cannot turn them off will simply stop
-- using the feature.
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists policy_snapshot jsonb not null default '[]'::jsonb;

alter table public.invoices
  add column if not exists show_policies boolean not null default true;

-- ---------------------------------------------------------------------------
-- The live lists, in the shape the PDF wants.
--
-- 'inclusions' is deliberately excluded: what a package covers is described by
-- the invoice's own line items, and printing a generic inclusions list beside
-- lines that were typed by hand invites the two to contradict each other.
-- ---------------------------------------------------------------------------
create or replace function public.invoice_policy_lists()
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('title', l.title, 'items', to_jsonb(l.items))
      order by
        -- Policies before notes: terms first, reminders after.
        case l.section when 'policies' then 0 else 1 end,
        l.sort_order,
        l.title
    ),
    '[]'::jsonb
  )
  from public.site_content_lists l
  where l.section in ('policies', 'notes')
    and cardinality(l.items) > 0;
$$;

-- ---------------------------------------------------------------------------
-- Freeze the snapshot alongside everything else 017 freezes.
--
-- Without this the column would be the one part of an issued invoice a stray
-- PATCH could still rewrite, which is exactly the hole the trigger exists to
-- close.
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
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'a cancelled invoice cannot be reopened';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Take the snapshot at issue, in the same statement that burns the number.
--
-- Doing it here rather than in the browser is what makes it reliable: there is
-- no window in which an invoice is numbered but its terms were never captured,
-- and no way for a client to send different text than the site shows.
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
  v_show boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select status, show_policies
    into v_status, v_show
    from public.invoices
   where id = p_invoice;

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
         -- Only when the admin asked for them; an empty array otherwise, so
         -- "not printed" and "printed nothing" stay the same thing.
         policy_snapshot = case
           when coalesce(v_show, true) then public.invoice_policy_lists()
           else '[]'::jsonb
         end,
         updated_at = timezone('utc', now())
   where id = p_invoice;

  return v_number;
end;
$$;

revoke all on function public.issue_invoice(uuid, date) from public;
grant execute on function public.issue_invoice(uuid, date) to authenticated;
