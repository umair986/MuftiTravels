-- ============================================================================
-- Quotation trip details: the facts a customer compares agents on.
--
-- 024 built the quotation as a priced OFFER — lines, a discount, a total, an
-- expiry. Everything a customer argues about on the phone before they get to
-- the price was missing, because the invoice shape it was modelled on has no
-- room for it: an invoice is settled with someone who already agreed, so it
-- never has to say which hotel, how far from the Haram, or how many of the ten
-- travellers are children who will not need a bed.
--
-- A quotation does. The document Mufti Travels sends today — a Word file,
-- rebuilt by hand per customer — leads with exactly these facts, and the
-- generated PDF could not reproduce it. This migration adds what that document
-- states and this table could not hold.
--
-- The organising rule, unchanged from 024:
--
--   A QUOTATION IS AN OFFER, NOT A RECORD.
--
-- Which is why none of this is normalised. Every column below is a SNAPSHOT of
-- what was offered, in the words it was offered in. Three decisions follow:
--
--   1. ACCOMMODATION IS jsonb ON THE ROW, NOT A CHILD TABLE. It is two or three
--      rows, written once, read only by the renderer, and never filtered or
--      aggregated. inclusions and exclusions set that precedent in 024 for the
--      same reasons. A quotation_accommodation table would buy referential
--      integrity against nothing — there is nothing to refer to, because the
--      hotel is typed text, not a catalogue row.
--
--   2. THE HOTEL IS TEXT, NOT A JOIN. Same argument as Decision 1 of
--      docs/quotations.md and Decision 5 of the finance doc: a hotel renamed or
--      re-rated in November must not restate an offer made in April. The admin
--      may copy a name off the catalogue; what lands here is a string.
--
--   3. pax STAYS AUTHORITATIVE. adults + children + infants is a BREAKDOWN for
--      the passenger summary, not a replacement head count, and there is no
--      constraint tying the two together. A quotation whose breakdown is all
--      zeros is the normal case for a first draft, and rejecting it would mean
--      the admin cannot save until they have asked a question the customer has
--      not been asked yet. The editor keeps them in step; the database does not
--      insist, because the per-person figure must keep working either way.
--
-- Nothing here is required. Every column has a default that renders as "say
-- nothing", so a quotation written the way 024's were still produces a correct
-- document — the new blocks simply do not print.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- What is being sold, in the customer's vocabulary.
--
-- These are free text rather than enums on purpose. "Gold & Gold Plus Package"
-- is not a value in any catalogue — it is a thing the admin said on the phone,
-- and next season it will be something else. An enum would turn every new
-- package name into a migration.
--
-- service_type defaults to 'Umrah' because that is what this business sells;
-- it exists so a Ziyarat or Hajj quotation does not print the wrong word.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists service_type  text not null default 'Umrah',
  add column if not exists package_type  text not null default '',
  add column if not exists sharing_type  text not null default '';

-- ---------------------------------------------------------------------------
-- Who to ask about it.
--
-- The customer phones back about "the quote Rashid sent", not about MTQ/26-27/
-- 0014. Stored on the quotation and not looked up from admin_users because the
-- person who prepared an offer is a fact about that offer: they may leave, and
-- the document they sent still says who to ask for.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists sales_rep_name  text not null default '',
  add column if not exists sales_rep_phone text not null default '';

-- ---------------------------------------------------------------------------
-- How long the trip is.
--
-- duration_days is typed, not derived from travel_date and return_date. The
-- common case at quotation time is "15 days in December" with no dates fixed at
-- all, and a derived column would print nothing for the single most-quoted fact
-- on the page. When both dates ARE known the editor fills this from them, so
-- the two agree without the database having to choose which one wins.
--
-- Nights are not stored: a 15-day trip is 14 nights, and durationLabel() in
-- src/lib/quotations.ts does that subtraction in one place.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists return_date   date,
  add column if not exists duration_days integer;

-- ---------------------------------------------------------------------------
-- Who is travelling.
--
-- Four counts, because a child's price depends on which of these they are and
-- the distinction is a bed, not an age: a child sharing a parent's bed is
-- charged differently from one occupying their own, and an infant occupies
-- neither. The passenger summary on the PDF prints all four, including zeros,
-- because "0 infants" is an answer the customer gave and a blank is not.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists adults               integer not null default 0,
  add column if not exists children_with_bed    integer not null default 0,
  add column if not exists children_without_bed integer not null default 0,
  add column if not exists infants              integer not null default 0;

-- ---------------------------------------------------------------------------
-- Where they are staying.
--
-- An array of objects, each one city's hotel:
--
--   [{ "city": "Makkah", "hotel": "Elaf Diamond", "distance": "300 m",
--      "room": "Sharing", "nights": 9,
--      "check_in": "04:00 PM", "check_out": "12:00 PM" }]
--
-- Times are text, not `time`. They are a hotel's stated policy quoted back to
-- the customer — "12:00 PM (Saudi local time)" — and parsing them into a
-- timezone-less SQL type would lose the only part that matters while gaining
-- nothing: nothing ever sorts or compares them.
--
-- `distance` is text for the same reason. "300 Mtr", "00Mtr", "walking
-- distance" and "opposite Gate 79" are all answers the business gives, and a
-- numeric column could hold only the first two.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column if not exists accommodation jsonb not null default '[]'::jsonb;

do $$
begin
  -- A negative traveller is a typo. Not an upper bound: a group booking of
  -- ninety is a real thing this business does, and a cap would reject it.
  if not exists (select 1 from pg_constraint where conname = 'quotations_traveller_counts') then
    alter table public.quotations
      add constraint quotations_traveller_counts
      check (
        adults               >= 0 and
        children_with_bed    >= 0 and
        children_without_bed >= 0 and
        infants              >= 0
      );
  end if;

  -- A trip of zero days is not a trip, and one of a year is not a quotation.
  -- Null stays allowed: "we have not discussed dates" is the state every
  -- quotation starts in.
  if not exists (select 1 from pg_constraint where conname = 'quotations_duration_sane') then
    alter table public.quotations
      add constraint quotations_duration_sane
      check (duration_days is null or duration_days between 1 and 365);
  end if;

  -- The return cannot precede the departure. Both nullable, so this only bites
  -- when both are known.
  if not exists (select 1 from pg_constraint where conname = 'quotations_return_after_travel') then
    alter table public.quotations
      add constraint quotations_return_after_travel
      check (
        travel_date is null or return_date is null or return_date >= travel_date
      );
  end if;

  -- Shaped like inclusions / exclusions in 024: an ARRAY, so the renderer can
  -- map over it without a type check on every read. The objects inside are not
  -- constrained — a key added next season should not need a migration, and a
  -- missing one renders as a line that does not print.
  if not exists (select 1 from pg_constraint where conname = 'quotations_accommodation_is_array') then
    alter table public.quotations
      add constraint quotations_accommodation_is_array
      check (jsonb_typeof(accommodation) = 'array');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- quotation_items.description — room for an itinerary inside one line.
--
-- 024 capped it at 500 characters, which was right for a line that reads
-- "15 Days Regular Umrah · Silver · Quad". It is wrong for the line the
-- reference document actually prints: a package name, the room, then two levels
-- of hotels, transfers, ziyarat, meals, visa, laundry and Zam Zam nested
-- underneath — one priced line, around two thousand characters of it. Splitting
-- that into rows is not the alternative, because it would put a rate and an
-- amount beside "Zam Zam Water".
--
-- 4000, not unbounded. The cap stops a pasted document rather than a typed
-- itinerary, and a text column with no limit at all is how one row becomes a
-- megabyte that every list query then carries.
--
-- The constraint is dropped and recreated because a CHECK cannot be widened in
-- place. Nothing can fail it on the way through: every existing row already
-- satisfies the tighter bound.
-- ---------------------------------------------------------------------------
alter table public.quotation_items
  drop constraint if exists quotation_items_text_len;

alter table public.quotation_items
  add constraint quotation_items_text_len
  check (
    char_length(description) between 1 and 4000
    and char_length(source_package_slug) <= 200
  );

-- ---------------------------------------------------------------------------
-- quotation_overview — the list screen's source, rebuilt.
--
-- `create or replace view` cannot add a column to an existing view, so this
-- drops and recreates it. The definition is 024's with three columns added:
-- the list screen shows "15D · Gold Package · 10 adults" under the customer
-- name, and without these it would need a second query per row to do it.
--
-- is_expired is unchanged and still computed HERE rather than in the browser,
-- for the reason 024 gives: the browser's today is the viewer's device clock.
-- isExpired() in src/lib/quotations.ts mirrors it, and the two are a pair.
-- ---------------------------------------------------------------------------
drop view if exists public.quotation_overview;

create view public.quotation_overview as
select
  q.id,
  q.number,
  q.status,
  q.revision,
  q.customer_name,
  q.customer_phone,
  q.departure_city,
  q.pax,
  q.quote_date,
  q.sent_on,
  q.valid_until,
  q.subtotal_paise,
  q.discount_paise,
  q.total_paise,
  q.converted_invoice_id,
  q.pdf_path,
  q.created_at,
  q.updated_at,

  q.package_type,
  q.duration_days,
  q.sales_rep_name,

  (
    q.status = 'sent'
    and q.valid_until is not null
    and q.valid_until < current_date
  ) as is_expired
from public.quotations q;

-- The view is owned by the definer and queried by authenticated admins through
-- PostgREST. RLS on public.quotations is what gates it — a view does not carry
-- policies of its own, and `security_invoker` makes the underlying table's
-- policies apply to the caller rather than to the view's owner. Without it an
-- admin check would be bypassed by anyone who could reach the view.
alter view public.quotation_overview set (security_invoker = on);

grant select on public.quotation_overview to authenticated;

-- ---------------------------------------------------------------------------
-- send_quotation() is deliberately NOT touched.
--
-- It allocates the number, bumps the revision and freezes the policy snapshot.
-- None of the columns above participate in any of that: they are content, and
-- content on a quotation stays editable after sending by design (Decision 2 of
-- 024). A re-send writes a new PDF at a new path, which is how a changed hotel
-- reaches the customer.
-- ---------------------------------------------------------------------------
