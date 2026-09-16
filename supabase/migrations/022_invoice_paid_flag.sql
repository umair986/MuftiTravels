-- ============================================================================
-- "Paid" on the invoice itself.
--
-- The bug this fixes: a payment was recorded, the RECEIPT correctly stamped
-- itself PAID — and the invoice PDF went on saying nothing at all, because
-- that file was rendered and frozen at issue, before any payment existed. Two
-- documents about the same money, disagreeing.
--
-- The fix is not to make the invoice read the payments ledger. Mufti Travels
-- sends the invoice only once the money has cleared; part payments are what
-- receipts are for. So the invoice needs one plain statement — settled, or
-- not — which the admin sets, and which is true on the day the document is
-- sent.
--
-- Hence a flag rather than a derivation. `invoice_balances` still answers
-- "what is outstanding across the book"; this answers "what does this piece of
-- paper say". The editor warns when the two disagree.
--
-- Deliberately NOT added to guard_issued_invoice()'s frozen set. Whether the
-- money arrived is a later fact about the world, not part of the document's
-- content — the same reasoning that leaves `trip_id` and `pdf_path` editable
-- after issue. Marking an issued invoice paid writes a second PDF beside the
-- first (see invoicePdfPath in src/lib/invoices.ts); it never rewrites the
-- file the customer was already sent.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.invoices
  add column if not exists paid_in_full boolean not null default false;

comment on column public.invoices.paid_in_full is
  'What the invoice PDF states about payment: settled, or pending. Set by the '
  'admin, not derived from invoice_payments — the ledger answers a different '
  'question and the two are allowed to disagree while money is in transit.';

-- ---------------------------------------------------------------------------
-- Terms are gone from the invoice.
--
-- `invoices.terms` and `business_profile.invoice_terms` both existed to fill
-- one small panel in the PDF footer. Migration 021 put the site's real payment
-- and cancellation policies on the invoice as a full annexure, which says
-- everything that panel said and says it properly — so the panel, the
-- per-invoice textarea and the business-wide default have all been removed
-- from the application.
--
-- The COLUMNS stay. They hold text an admin typed onto invoices that have
-- already been issued and sent, and dropping them would destroy that text to
-- tidy up a schema. Nothing reads or writes them any more; they are a record,
-- not a field.
-- ---------------------------------------------------------------------------
comment on column public.invoices.terms is
  'DEPRECATED since migration 022. No longer read or written — the policies '
  'annexure (migration 021) replaced this panel. Retained because issued '
  'invoices carry text here that was printed and sent.';

comment on column public.business_profile.invoice_terms is
  'DEPRECATED since migration 022. See invoices.terms.';
