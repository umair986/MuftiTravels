-- ============================================================================
-- A travel date on the invoice.
--
-- The counter asked for it beside the invoice date and the due date: the first
-- thing a pilgrim checks on a bill is that it is for the right departure, and
-- until now that date lived only inside the flight legs (if they were known)
-- or the notes.
--
-- One nullable `date`, and null prints nothing — an invoice nobody fills this
-- in on renders exactly the document it rendered before (the rule 025 and 031
-- follow).
--
-- Rejected: deriving it from the first flight leg. Flights are often not
-- ticketed when the bill goes out, and a leg's date is typed as "26Dec" with
-- no year — guessing the year is how a customer gets a bill for last
-- December. A plain field the admin fills is the honest version.
--
-- Rejected: linking it to `trip_id`'s trip. trip_id is a reporting tag that may
-- change after issue (018); a date the customer sees is document content, and
-- document content is copied, not joined.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.invoices
  add column if not exists travel_date date;

comment on column public.invoices.travel_date is
  'Departure date printed in the invoice header. Null prints nothing. Frozen at issue by guard_issued_invoice().';

-- ---------------------------------------------------------------------------
-- Freeze it at issue, with the flights.
--
-- A changed departure is a date change under the cancellation policy, and the
-- bill the customer already holds must keep saying what it said — so it is
-- cancel and reissue, the same as the flights themselves. (due_date stays
-- editable, as it always has: it is when we want paying, not what was sold.)
--
-- The whole function is restated from 031 with one block added.
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

    if new.travel_date is distinct from old.travel_date then
      raise exception 'the travel date on an issued invoice cannot be changed; cancel and reissue';
    end if;
  end if;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'a cancelled invoice cannot be reopened';
  end if;

  return new;
end;
$$;
