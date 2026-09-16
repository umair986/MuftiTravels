-- ============================================================================
-- Removing a lead: enquiries and meta_leads get a deleted_at stamp.
--
-- Both lists fill up with rows nobody will ever call — a test submission, a
-- misdialled number, a duplicate the dedupe key did not catch — and until now
-- the only way to clear one was to mark it closed, which is a lie: closed means
-- the conversation ended, not that the row was never real.
--
-- SOFT, not hard, for three reasons:
--
--   * RE-IMPORT. meta_leads dedupes on dedupe_key. Delete the row outright and
--     the next sheet upload — which always overlaps the last one — brings the
--     lead straight back, still marked New. Keeping the row keeps the key, so
--     the upsert's ignoreDuplicates leaves it deleted.
--   * INVOICES. invoices.source_enquiry_id and .source_meta_lead_id are
--     `on delete set null`, so a hard delete would quietly cut a real invoice
--     loose from where the customer came from.
--   * MIS-CLICKS. A customer's phone number is not recoverable from anywhere
--     else. This matches expenses (017), which stamp rather than delete for the
--     same reason.
--
-- Nothing restores these through the UI beyond the undo offered right after the
-- click; a row deleted by mistake yesterday is a `update ... set deleted_at =
-- null` in the SQL editor.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.enquiries
add column if not exists deleted_at timestamptz;

alter table public.meta_leads
add column if not exists deleted_at timestamptz;

-- ---------------------------------------------------------------------------
-- Indexes. Both screens are "one status, newest first, not deleted", and both
-- ask for exact counts per status on every load, so the partial indexes carry
-- the filter rather than leaving the planner to discard deleted rows after the
-- fact.
-- ---------------------------------------------------------------------------
create index if not exists enquiries_live_status_created_idx
on public.enquiries (status, created_at desc)
where deleted_at is null;

create index if not exists enquiries_live_created_idx
on public.enquiries (created_at desc)
where deleted_at is null;

create index if not exists meta_leads_live_status_created_idx
on public.meta_leads (status, created_at desc)
where deleted_at is null;

create index if not exists meta_leads_live_created_idx
on public.meta_leads (created_at desc)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Anonymous submitters may not pre-delete their own enquiry. The insert policy
-- already pins status and admin_notes (010); deleted_at belongs on that list
-- for the same reason — a row created already-hidden is a row the office never
-- sees.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can submit enquiries" on public.enquiries;
create policy "Anyone can submit enquiries"
on public.enquiries for insert
to anon, authenticated
with check (status = 'new' and admin_notes = '' and deleted_at is null);
