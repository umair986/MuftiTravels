-- ============================================================================
-- Somewhere to record what happened on an enquiry.
--
-- Staff had no way to note "called twice, no answer" or "wants Ramadan dates,
-- calling back Tuesday", so that context lived in one person's head. This is
-- internal only — nothing on the public site reads it.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.enquiries
add column if not exists admin_notes text not null default '';

comment on column public.enquiries.admin_notes is
  'Internal follow-up notes written by staff. Never shown to the customer.';

-- Sorting and filtering the enquiry list both hit these.
create index if not exists enquiries_status_created_idx
on public.enquiries (status, created_at desc);
