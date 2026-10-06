# Quotation Generator

**Status:** Built, phases 0–6. Migration `024_quotations.sql` — **not yet applied to the live database.**
**Written:** 3 October 2026
**Depends on:** migrations 001–023, `public.is_admin()` (008), `public.fy_label()` and the `invoice_counters` pattern (017), `public.invoice_policy_lists()` (021), the `AdminShell` sidebar (`src/app/admin/AdminShell.tsx`)

> This began as a decision document written before the build and is now also the record of what
> was built, in the shape of `docs/finance-expenses-and-invoicing.md`. Where it disagrees with
> that document it does so deliberately and says why — a quotation is not an invoice, and several
> of the invoice rules would be actively wrong here. Where the implementation diverged from the
> plan, the plan text was corrected rather than left standing; see **Deviations, as built** near
> the end.

---

## What this is for

An admin takes a call. *"I want a Silver package from Mumbai, we're ten people, give us a
discount."* The admin says **"let me get back to you with the quotation"** — and today has
nothing to get back with.

| Built alone | What you get | What is still missing |
|---|---|---|
| Invoice generator (017–023) | A GST bill for a sale already agreed | Nothing to send *before* the customer agrees |
| Enquiry + Meta lead inbox (004, 015) | A name, a phone number and a package preference | No priced answer to send back |
| Package catalogue (001–007) | A published per-person rate per tier and sharing | No way to turn it into a document |

The gap is one document: a **priced, branded, dated offer** the admin can put on WhatsApp within
two minutes of the call ending. Build it and the funnel the codebase already half-builds finally
closes end to end:

> **enquiry → quotation → invoice → receipt**

Three things it must do, which are the spine of everything below:

1. **Pull the published price**, so nobody retypes ₹1,10,000 off the website.
2. **Let the admin overrule every number**, because the price agreed on the phone — not the
   price on the website — is the price that goes on the paper.
3. **Stay editable and re-sendable**, because a quotation is the opening move in a negotiation,
   not a record of its outcome.

---

## The single most important design rule

> **A quotation is an offer, not a record. An invoice is a record, not an offer.**

Every rule in `docs/finance-expenses-and-invoicing.md` descends from *"an issued invoice is a
historical fact"*. That sentence is about a document with legal weight: a GST number consumed
from a consecutive series, amounts that cannot be edited after issue, terms frozen at the moment
of sending.

A quotation has none of that weight. It states what we are willing to charge **today**. If the
customer pushes back, the right response is to change the quotation — not to cancel it and issue
a credit note. So the invoice rules do not transfer by default; each one has to be re-argued from
scratch, and four of them come out the other way:

| Invoice rule | Quotation |
|---|---|
| Decision 5: the generator does not know the catalogue exists | **Reversed.** It reads the catalogue. See Decision 1. |
| `guard_issued_invoice()` refuses edits after issue | **Reversed.** Edits are the point. See Decision 6. |
| Decision 8: inclusions are deliberately not printed | **Reversed.** A quote is sold on its inclusions. See Decision 8. |
| Numbers are consecutive and legally capped at 16 characters | **Relaxed.** No GST constraint applies. See Decision 5. |
| Money is integer paise everywhere | **Kept, without exception.** See Decision 3. |
| Customer details are a snapshot, never a live join | **Kept.** See Decision 2. |
| Stored PDFs are never overwritten | **Kept.** See Decision 6. |

---

## Decision 1 — A quotation may read the catalogue; an invoice may not

This is the question the feature exists to answer, so it gets the fullest treatment.

Decision 5 of the finance document is unusually emphatic. It does not say the coupling to
`public.packages` is avoided where possible; it says it is **absent**, enforced as a reviewable
grep, and it names in advance the exact request that will one day try to undo it:

> **Pressure to re-link the catalogue.** At some point "just add a package dropdown so it fills
> the price in" will sound harmless. It is the same request Decision 5 declines, and the answer
> is a line preset, not a foreign key.

A quotation generator **is** that request. So it has to be answered, not sidestepped.

### Why the two failures Decision 5 names cannot happen here

Decision 5 rests on two concrete failures, and both are failures of a *stored, sent* document
silently changing:

- *"A package price is edited in November. Without snapshotting, every invoice raised against
  that package in April silently changes its total."*
- *"Coupling billing to it makes a copy tweak on the website a change to accounting data."*

Both are caused by a **live join at render time**. Neither is caused by reading the catalogue
**once, at the moment the admin picks a package**, and copying the result into an editable field.
That is not a link; it is a keystroke saved. The invoice generator already does exactly this
twice over, and Decision 5 blesses both:

- **Line presets** — `invoice_line_presets` rows copied into editable text, no id retained.
- **Lead prefill** — Decision 6's *"one-time copy into editable inputs"* from `enquiries`.

A package pick is the same mechanism with a different source table.

### Why Decision 5's third argument argues *for* the coupling

The remaining argument is that *"the catalogue serves the public website"* and is edited for
marketing reasons. True — and a quotation is a **marketing document**. It is the written form of
a sales conversation about a published package. The website's price is not incidental data it
happens to need; it is the subject of the conversation. A quotation that could not state the
published price would be answering a different question than the one the customer asked.

### Options rejected

- **A line-preset table for packages.** The honest version of Decision 5's own suggested answer.
  Rejected because the catalogue already holds this data, keyed by tier and sharing, maintained
  by the same admin, in `/admin/packages`. A parallel preset table would be a hand-copied
  duplicate of `packages.prices` that silently rots the first time a season's rates change — and
  a stale preset is a worse failure than a live read, because nobody knows it is stale.
- **Typing the rate every time, like the invoice editor.** This is exactly what the business is
  asking us to stop doing, in the one place where the rate genuinely is published and stable.
- **Letting the invoice editor read the catalogue too, for consistency.** Rejected outright.
  Consistency is not a reason to weaken the one rule protecting accounting records. The two
  documents have different jobs and are allowed to have different rules.

### The constraint that replaces it

The coupling is **one directory wide and strictly one-way**:

```
src/app/admin/quotations/**      MAY read the catalogue. The only place that may.
src/lib/quotations.ts            MUST NOT. Pure arithmetic and data access only.
src/lib/pdf/**                   MUST NOT. A renderer takes data; it does not go and find it.
src/lib/invoices.ts              MUST NOT. Unchanged from Decision 5.
src/app/admin/invoices/**        MUST NOT. Unchanged from Decision 5.
```

So Decision 5's grep check survives intact and gains one clause:

> Nothing under `src/lib/invoices.ts`, `src/lib/quotations.ts`, `src/lib/pdf/` or
> `src/app/admin/invoices/` may import `src/lib/packages*.ts`, `src/lib/categories.ts` or
> `src/lib/categoryFields.ts`. `src/app/admin/quotations/` may — and is the only place that may.

```powershell
Select-String -Path src/lib/invoices.ts,src/lib/quotations.ts,src/lib/pdf/*,src/app/admin/invoices/* `
  -Pattern "lib/packages|lib/categories|lib/categoryFields"
```

That command returning nothing is the whole of Decisions 1 and 5 as a check.

---

## Decision 2 — A catalogue price is copied into editable text, never linked

`quotation_items` holds a description, a quantity, a unit price and a line total. There is **no
`package_id`**, for the same reason `invoice_items` has none: a tier rename or a seasonal
re-pricing must not reach back into a quotation the customer is holding.

One column does record where a line came from:

```sql
source_package_slug text not null default '',
```

Text, not a foreign key. Deliberately:

- It answers the one question worth asking — *"which packages are we actually quoting?"* —
  without a join and without an `on delete` decision.
- It survives the package being renamed, re-slugged or deleted, as a historical note about what
  the line was *at the time*. A foreign key would either block the delete or null itself out,
  and both lose the fact.
- Nothing reads it back to render. If it disagrees with `description`, `description` wins,
  because `description` is what the customer was sent.

The picker's entire output is a plain object with no ids in it:

```ts
{ description: `${pkg.name} · ${tierName} · ${sharing}`,
  unitPrice: paiseToInputValue(rupeesToPaise(rate)),
  sourcePackageSlug: pkg.slug,
  inclusions: pkg.features }
```

Everything in it is editable from that moment on.

---

## Decision 3 — The catalogue is in rupees; convert once, at the boundary

This is small, and it is the one place a real bug is waiting.

`packages.prices` is `jsonb` shaped `{ "<tier-key>": { "<sharing>": <rupees> } }` —
`{"gold": {"Quad": 74786, "Child(6-11)": 64786}}` — and `packages.starting_price` is
`numeric(12,2)`. **Rupees.** Everything in the finance module is integer paise, and Decision 2 of
the finance document allows exactly one module to convert between paise and anything else:
`src/lib/money.ts`.

So the conversion gets one function, in that module, with one job:

```ts
/** The catalogue stores rupees; everything downstream is paise. Converted once, here. */
export function rupeesToPaise(rupees: number): number;
```

`Math.round(rupees * 100)`, returning `0` for `NaN`, negatives and anything above `MAX_PAISE`. It
is called exactly once, in the package picker, at the moment the rate is read. From there the
value is a paise integer like every other amount in the system and flows through
`computeInvoiceTotals` untouched.

**Options rejected:**

- **Multiplying by 100 inline in the picker.** It is one expression, which is precisely why it
  would be copy-pasted into a second place within a month. Decision 2's rule exists so that
  "where does a float become an integer?" has exactly one answer.
- **Storing paise in `packages.prices` instead.** A data migration across every published
  package and every admin editor, plus a public-site rewrite, to serve an admin convenience. The
  public catalogue's units are its own business.

---

## Decision 4 — The discount is one whole-quote figure, stored resolved

The scenario that prompted this feature is *"ten people, give us a discount"* — a discount on the
deal, not on a line. `computeInvoiceTotals` in `src/lib/finance.ts` already models exactly that:
a single `discountPaise` subtracted from the subtotal before tax, clamped to `[0, subtotal]` so
taxable can never go negative.

So the arithmetic is **reused without modification**. `src/lib/quotations.ts` adds no totals
function of its own; it adds only the resolver in front of it:

```ts
export function resolveQuoteDiscount(
  subtotalPaise: number, mode: DiscountMode, percentBp: number, amountPaise: number,
): number;
```

Three columns carry it, and the redundancy is the point:

```sql
discount_mode        text    not null default 'none'  -- 'none' | 'amount' | 'percent'
discount_percent_bp  integer not null default 0       -- 500 = 5%, basis points like tax_rate_bp
discount_paise       bigint  not null default 0       -- the resolved figure, always stored
```

`discount_paise` is **always** stored, even when the mode is `percent`. The PDF and the total
must never depend on re-deriving a percentage: a rounding rule changed a year later would
silently restate a document the customer is holding. The percentage is kept only so the PDF can
print the line the customer wants to read — **`Discount (5%)  −₹55,000`** — because "5% off
because you're ten people" is the concession they negotiated, and a bare rupee figure throws that
away.

**Options rejected:**

- **Per-line discounts.** Not what was asked for, and they make the one number the customer cares
  about — the concession — impossible to state on the document.
- **Percentage only, resolved at render.** See above: the stored total would not be a fact.
- **Overriding the grand total directly.** Tempting ("just make it ₹10,45,000"), and it reads as
  flexibility. It is not: the subtotal and the total would disagree with no explanation on the
  page, and `quotations_total_balances` could not be enforced. If the admin wants an arbitrary
  final figure, a flat `amount` discount reaches it and *shows its working*.

### The per-person headline

The customer asked *"what's the rate per person?"*, so the document answers in those words. A
nullable `pax integer` on the header, prefilled from the sum of the line quantities and
overridable, drives one derived figure:

```ts
export function perPersonPaise(totalPaise: number, pax: number | null): number | null;
```

Printed as **`≈ ₹1,04,500 per person × 10`** in a gold band under the total. Derived, never
stored, and printed with `≈` because it is `Math.floor` of a division that rarely comes out even
— a quotation that implies false precision about a per-head rate invites an argument at the
counter.

---

## Decision 5 — Numbered at first send, not at creation

Format: **`MTQ/26-27/0001`** — `{quote_prefix}/{financial year}/{zero-padded sequence}`,
allocated by the same mechanism as an invoice number: a per-FY counter row updated under its own
row lock inside a `security definer` function.

```sql
update public.quotation_counters set next_seq = next_seq + 1
 where fy_label = v_fy returning next_seq - 1 into v_seq;
```

Three things differ from invoice numbering, all because no law is involved:

- **No 16-character ceiling.** `MTQ/26-27/0001` is fourteen characters so it fits anyway, but the
  constraint is 20 and the reason is comfort, not compliance.
- **Gaps are harmless.** Numbers are still allocated at **send** rather than at creation, for the
  plainer reason that *a draft is not yet an offer*. A number is what the customer refers to on
  the phone; handing one out before anything was sent means the admin and the customer can
  disagree about whether `MTQ/26-27/0007` exists.
- **A separate counter table.** `quotation_counters`, not a shared one. The two series must be
  able to run at completely different rates — most quotations never become invoices, which is
  the normal and healthy case.

`quote_prefix` and `quote_validity_days` are new columns on `business_profile`, beside
`invoice_prefix`. Deriving the prefix (`invoice_prefix || 'Q'`) was rejected: a business that
wants `EST/` quotes and `MT/` bills should not have to rename its invoices to get them.

---

## Decision 6 — A sent quotation stays editable; `revision` counts *sends*, not edits

`guard_issued_invoice()` exists to make a sent document unchangeable. Cloning it here would make
the feature useless: the customer will push back, and the answer is a better quotation, not a
cancellation.

But two things still have to hold:

1. **The number is fixed once allocated.** It is what the customer calls the document.
2. **A PDF the customer already has must keep opening what they were actually sent** — Decision 1
   of the finance document, restated: *"Stored PDFs are never overwritten."*

Both fall out of one choice: **`revision` counts how many times the quotation has been sent, not
how many times it has been edited.**

```sql
revision integer not null default 1
```

`send_quotation()` allocates the number on the first call and, on every call after that,
increments `revision`, refreshes `sent_on` / `valid_until`, re-snapshots the policies and returns
the **same** number. The stored PDF path carries the revision:

```ts
quotationPdfPath(id, number, revision)   // `${id}/MTQ-26-27-0001-r2.pdf`
```

So revision 1 and revision 2 are different objects in the bucket, the `quotations` bucket has no
UPDATE policy with which to overwrite either, and a seven-day signed link the customer is holding
keeps resolving to the document they were sent. `uploadPdfOnce`'s *"already exists means this is
that document"* reasoning carries over unchanged.

Counting sends rather than edits is what makes this work, and it is also what the customer means
by the word:

- **"Revision 2" is a thing the customer can have received.** Counting edits would print
  "Revision 7" on the second document they ever saw, which is noise.
- **The storage path changes exactly when a new file is written.** Counting edits would need the
  revision to move on a description-only change — invisible to the header's money columns — and
  would otherwise write revision 2's text to revision 1's path. Counting sends makes the question
  moot.
- **No trigger has to guess what a "material" change is.** That list would have been wrong.

The editor shows unsent work plainly rather than hiding it, which is why `sent_at timestamptz` is
stored next to `sent_on date`:

> *Revision 2 — edited since you sent it on 3 Oct. The copy the customer holds is unchanged.
> Re-send to share the update.*

**What the trigger still does.** `bump_quotation_revision()` is a `before update` trigger reduced
to three jobs, none of which is a refusal to edit: the number, `fy_label` and `seq` are immutable
once `number` is non-null; `revision` may never decrease; `updated_at` is stamped.

**Options rejected:**

- **Clone `guard_issued_invoice()`.** Makes the document read-only at the exact moment
  negotiation starts.
- **Bump `revision` on every material edit, via triggers on both tables.** What the first draft
  of this plan proposed. It needs a hand-maintained list of "material" columns, a statement-level
  trigger with transition tables on `quotation_items` so that a five-line edit is not counted as
  five revisions, and it still prints a revision number the customer never saw.
- **Overwrite the PDF in place and give the bucket an UPDATE policy.** Breaks the one property
  that makes a signed link safe to send.
- **Supersede: mark the old quotation dead and create a new one.** Invoice-shaped thinking. It
  scatters one negotiation across five rows and makes "what did we quote this customer?"
  unanswerable.

---

## Decision 7 — Expiry is derived in SQL, never stored, never read off the browser clock

A quotation carries `valid_until date`, defaulted to
`sent_on + business_profile.quote_validity_days` (seven). Whether it has *expired* is not a
column. It is a comparison against today, and migration 018 already settled where that comparison
belongs — `invoice_balances.is_overdue` is computed in SQL on purpose, because **the browser's
"today" is the viewer's device clock**.

```sql
create or replace view public.quotation_overview as
select ...,
       (q.status = 'sent'
        and q.valid_until is not null
        and q.valid_until < current_date) as is_expired
  from public.quotations q;

alter view public.quotation_overview set (security_invoker = on);
```

The `security_invoker` line is load-bearing, exactly as it is on `invoice_balances`: without it
the view runs as its owner and bypasses RLS.

`expired` is therefore a **fifth display state** over four stored statuses (`draft`, `sent`,
`accepted`, `declined`) — the same shape as `PAYMENT_STATUSES` layering over `INVOICE_STATUSES`
in `src/lib/finance.ts`. A matching pure `isExpired()` exists in `src/lib/quotations.ts` for
labelling a row the editor already holds, and the two must agree; they are commented as a pair,
like `fyLabel` and `public.fy_label()`.

An expired quotation is not cancelled, deleted or hidden. It is a document whose price is no
longer promised, and the only correct action on one is to re-send it — which sets a new
`valid_until` and bumps the revision.

---

## Decision 8 — A quotation prints its inclusions; an invoice deliberately does not

Decision 8 of the finance document is explicit that inclusions are deliberately **not** printed
on an invoice. A bill is a demand for money against a sale already made; restating the marketing
copy on it invites a dispute about whether a promise was kept.

A quotation is the opposite document. It is **sold on its inclusions.** A customer comparing us
to the agent down the road is comparing hotel distance, meal plan, Ziyarat, visa and transport —
not the grand total. A quote that states only a price loses to one that states what the price
buys.

So the quotation carries two editable lists:

```sql
inclusions jsonb not null default '[]'::jsonb,
exclusions jsonb not null default '[]'::jsonb,
```

String arrays, prefilled from the picked package's `features` and editable from then on —
Decision 2's one-time copy again. `exclusions` starts empty and is typed, because what a package
*excludes* is a sales judgement about this customer, not catalogue data.

The payment and cancellation terms come from the existing machinery, unchanged:
`public.invoice_policy_lists()` snapshotted into `policy_snapshot jsonb` by `send_quotation()`,
printed on an annexure page behind a `<View break>`. The snapshot-not-lookup argument from
invoice Decision 8 applies without modification — the terms a document states are the terms that
were published when it was sent.

---

## Decision 9 — Conversion to an invoice is a copy, and both ids are kept

When the customer says yes, the admin presses **Convert to invoice** and lands in a draft invoice
with the lines, the customer block, the discount and the tax mode already filled.

It is a **copy**, not a transformation and not a link. `createInvoiceFromQuotation()` inserts a
new `invoices` row and new `invoice_items` rows with fresh ids. From that moment the two documents
are independent, and every invoice rule applies to the invoice exactly as before — including that
its line items are typed text with no catalogue behind them. This is Decision 1 holding at the
boundary: the catalogue reaches the quotation, and the quotation reaches the invoice as plain
text, so the catalogue never reaches an accounting record.

Two nullable ids record the relationship, in the spirit of invoice Decision 6's
`source_enquiry_id`:

```sql
public.invoices.source_quotation_id    uuid references public.quotations (id) on delete set null
public.quotations.converted_invoice_id uuid references public.invoices  (id) on delete set null
```

Provenance only. Neither is read back to render anything. Together they answer the question the
business will actually ask — **"what share of what we quote converts, and at what discount?"** —
and they let the quotation screen show *"Invoiced as MT/26-27/0042"* instead of leaving the admin
to remember.

`source_quotation_id` is set when the draft is inserted, so it sits outside
`guard_issued_invoice()`'s frozen sets alongside `pdf_path`, `trip_id` and `paid_in_full`. The
migration comment says so, because a future reader will wonder.

Deliberately **not** copied: the quote number, `inclusions`, `exclusions`. An invoice is its own
document with its own number, and per invoice Decision 8 it does not print inclusions.

**Options rejected:**

- **Promote the quotation row in place into an invoice.** One table, two documents, two sets of
  immutability rules fighting each other. The quotation would have to become unchangeable at the
  moment of conversion, destroying the record of what was offered.
- **A `document_type` column over one shared table.** The same problem, written more cleverly.
- **No link at all, just retype it.** The retyping is half the feature's value.

---

## Decision 10 — No customer-facing acceptance link in v1

The obvious next feature is a link in the WhatsApp message that the customer taps to accept.

It is out of scope, and the reason is architectural rather than a matter of effort.
`docs/security-audit.md` and `CLAUDE.md` are blunt about it:

> There is **no server-side API layer, so RLS is the entire security boundary.** Every read and
> write goes browser → Supabase PostgREST directly.

An accept link means an **anonymous write path into a finance table** — the first one in the
system. Doing it safely means an unguessable token column, a policy narrow enough that the token
is the only key, rate limiting that cannot be bypassed (finding `H2` in the security audit is
that exact problem, still only mitigated), and an answer for what an attacker who sprays tokens
can accept on someone else's behalf. That is a security review, not a feature.

Until then, acceptance is a status the admin sets after the phone call that follows, which is how
the business already works.

Also out of scope for v1, listed so they are not re-litigated mid-build: side-by-side tier
comparison columns in one PDF (the admin generates two quotations; the data model and the page
both stay simple), emailing the quotation, a `customers` table, and multi-currency.

---

## Schema

One migration: `supabase/migrations/024_quotations.sql`. Applied by hand, like every other —
**until it is applied, every quotation screen fails at runtime.**

### `business_profile` — two new columns

```sql
alter table public.business_profile
  add column if not exists quote_prefix text not null default 'MTQ',
  add column if not exists quote_validity_days integer not null default 7;
```

Checked to 1–5 characters and 1–365 days respectively.

### `quotations`

The column vocabulary deliberately mirrors `public.invoices` field for field, so
`createInvoiceFromQuotation` is a rename-free copy and so anyone who has read 017 can read this
table without a second thought. What is new: `departure_city` and `travel_date` (the catalogue has
no departure-city field at all — it is encoded only in package names and slugs, and it is the
first thing the customer said), `pax`, the three discount columns, `inclusions` / `exclusions`,
and `revision`.

```sql
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),

  -- Null while draft; allocated by send_quotation(). See Decision 5.
  number   text unique,
  fy_label text,
  seq      integer,
  status   text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined')),
  -- How many times this has been SENT, not edited. See Decision 6.
  revision integer not null default 1 check (revision >= 1),

  quote_date      date not null default current_date,
  sent_on         date,
  sent_at         timestamptz,
  valid_until     date,
  accepted_on     date,
  declined_reason text not null default '',

  -- Customer snapshot: the same seven columns as invoices, for the same reason.
  customer_name       text not null default '',
  customer_phone      text not null default '',
  customer_email      text not null default '',
  customer_address    text not null default '',
  customer_state      text not null default '',
  customer_state_code text not null default '',
  customer_gstin      text not null default '',

  -- What the customer actually asked for, and which the catalogue cannot answer.
  departure_city text not null default '',
  travel_date    date,
  pax            integer check (pax is null or pax > 0),

  source_enquiry_id   uuid references public.enquiries  (id) on delete set null,
  source_meta_lead_id uuid references public.meta_leads (id) on delete set null,
  trip_id             uuid references public.trips      (id) on delete set null,

  subtotal_paise      bigint  not null default 0 check (subtotal_paise >= 0),
  discount_mode       text    not null default 'none'
    check (discount_mode in ('none', 'amount', 'percent')),
  discount_percent_bp integer not null default 0 check (discount_percent_bp between 0 and 10000),
  discount_paise      bigint  not null default 0 check (discount_paise >= 0),
  taxable_paise       bigint  not null default 0 check (taxable_paise >= 0),
  tax_mode            text    not null default 'none'
    check (tax_mode in ('none', 'cgst_sgst', 'igst')),
  tax_rate_bp         integer not null default 0 check (tax_rate_bp between 0 and 10000),
  cgst_paise          bigint  not null default 0 check (cgst_paise >= 0),
  sgst_paise          bigint  not null default 0 check (sgst_paise >= 0),
  igst_paise          bigint  not null default 0 check (igst_paise >= 0),
  round_off_paise     bigint  not null default 0,          -- may be negative
  total_paise         bigint  not null default 0 check (total_paise >= 0),
  amount_in_words     text    not null default '',

  inclusions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  notes      text  not null default '',

  show_policies   boolean not null default true,
  policy_snapshot jsonb   not null default '[]'::jsonb,

  pdf_path text not null default '',
  -- Declared bare here and given its foreign key further down the migration:
  -- quotations and invoices point at each other, so one of the two references
  -- has to be added after both tables exist. See Decision 9.
  converted_invoice_id uuid,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

Named constraints, each added inside an idempotent `do $$ ... pg_constraint ... $$` block:

| Constraint | What it holds |
|---|---|
| `quotations_total_balances` | `total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise + round_off_paise` — the same identity `computeInvoiceTotals` guarantees, so bad arithmetic fails the insert instead of reaching a customer |
| `quotations_tax_mode_split` | `none` ⇒ all three tax columns zero; `cgst_sgst` ⇒ `igst = 0`; `igst` ⇒ `cgst = sgst = 0` |
| `quotations_discount_shape` | `none` ⇒ both discount figures zero; `amount` ⇒ `discount_percent_bp = 0` |
| `quotations_discount_within_subtotal` | `discount_paise <= subtotal_paise` — the clamp, enforced server-side too |
| `quotations_sent_has_number` | `status = 'draft' or (number is not null and sent_on is not null and fy_label is not null)` |
| `quotations_text_len` | mirrors the editor's `maxLength`s: number ≤20, name ≤200, phone ≤32, email ≤200, address ≤500, gstin ≤20, departure_city ≤120, notes ≤2000, declined_reason ≤500 |

Indexes: `(status, created_at desc)`, `(valid_until) where status = 'sent'`,
`(trip_id) where trip_id is not null`.

### `quotation_items`

`invoice_items` minus `sac_code` (a quotation is not a tax document), plus the provenance note
from Decision 2.

```sql
create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  description  text not null,
  -- Pax on this line. numeric(10,2) to match invoice_items, so the copy on
  -- conversion needs no coercion.
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  line_total_paise bigint not null check (line_total_paise >= 0),
  -- A note about where this line came from. NOT a foreign key, never joined.
  source_package_slug text not null default '',
  sort_order integer not null default 0
);
```

### `quotation_counters`

```sql
create table if not exists public.quotation_counters (
  fy_label text primary key,
  next_seq integer not null default 1 check (next_seq >= 1)
);
```

### `send_quotation()`

Structurally `issue_invoice()` from 021, with one difference that is the whole of Decision 6:
calling it twice is not an error. The first call allocates the number; every call after it bumps
the revision and returns the same number.

```sql
create or replace function public.send_quotation(
  p_quotation  uuid,
  p_sent_on    date    default current_date,
  p_valid_days integer default null
) returns text
language plpgsql security definer set search_path = public, pg_temp
```

Asserts `public.is_admin()`, refuses a quotation with no line items, allocates
`{quote_prefix}/{fy_label(p_sent_on)}/{lpad(seq,4,'0')}` under the counter row lock, sets
`status = 'sent'`, `sent_on`, `sent_at`, `valid_until`, and re-snapshots
`public.invoice_policy_lists()` when `show_policies`. Then `revoke all from public` and
`grant execute to authenticated`, as 017 does for `issue_invoice`.

### `bump_quotation_revision()`

`before update`, and — unlike `guard_issued_invoice()` — it refuses almost nothing. Three jobs:
the number, `fy_label` and `seq` are immutable once `number` is non-null; `revision` may never
decrease; `updated_at` is stamped. There is no companion guard on `quotation_items`, on purpose:
items stay editable for the life of the quotation.

### `quotation_overview`

The list view's source. Carries `is_expired` per Decision 7 and
`alter view ... set (security_invoker = on)`.

### RLS

`quotations`, `quotation_items` and `quotation_counters` join the same loop 017 uses — RLS
enabled, one `"Admins manage <table>"` policy per table,
`using (public.is_admin()) with check (public.is_admin())`, no anonymous path at all. Per
Decision 10 there is no customer-facing read, so there is nothing to carve out.

### Storage

A new **private** bucket `quotations`, 8 MiB, `application/pdf` only, with select / insert /
delete policies cloned from the `invoices` three and an explicit

```sql
-- Deliberately no update policy. See Decision 6: revision N's PDF is the
-- document the customer was sent, and the application should not be able to
-- overwrite it.
drop policy if exists "Admins update quotation pdfs" on storage.objects;
```

A separate bucket rather than a `quotations/` prefix inside `invoices`, because storage policies
are written per `bucket_id` and a prefix would need path-matching policies to keep the two
document sets distinct — more fragile, for no gain.

`uploadPdfOnce` in `src/lib/invoices.ts` gains a trailing `bucket: string = "invoices"`
parameter. One line, backwards compatible, and it keeps one upload path in the codebase with one
"already exists means this is that document" argument behind it.

---

## Application layout

```
src/lib/
  quotations.ts            statuses, types, pure arithmetic, pdf paths, WhatsApp links,
                           createQuotationFromLead, createInvoiceFromQuotation
  quotations.test.ts       Node's runner; must sit here — npm test globs src/lib/*.test.ts
  packages.client.ts       fetchQuotablePackages(supabase) — the first client-side catalogue
                           read in the project (packages.server.ts is "server-only")
  money.ts                 + rupeesToPaise (Decision 3)
  invoices.ts              + bucket param on uploadPdfOnce; + source_quotation_id on the row type
  pdf/
    QuotationDocument.tsx  the document; takes data, fetches nothing
    renderQuotation.ts     renderQuotationPdf, quotationFileName — every renderer import dynamic
    pdfSafeImage.ts        + pdfSafeBusiness, moved here from renderInvoice.ts so both use it
src/app/admin/quotations/
  page.tsx                 metadata + robots noindex, renders the client component
  AdminQuotationsPage.tsx  list, filters, stat tiles, paging
  PackagePicker.tsx        package → tier → sharing. THE ONLY UI THAT READS THE CATALOGUE
                           (the editor fetches the list; `packages.client.ts` is the only import).
  [id]/
    page.tsx
    QuotationEditor.tsx    the form, live totals, send / share / convert
scripts/
  render-quotation-check.mts   measures the rendered PDF, asserts page counts from both ends
```

Client components throughout, `createClient()` from `@/lib/supabase/client` with the house
null-guard, `useToast()` for write outcomes, `AdminShell` for chrome. **No new server surface** —
the PDF renders in the browser, as invoice Decision 1 requires, and nothing here is
server-rendered or cached, so no `revalidate` call is needed either.

### Sidebar

One link into the existing `Finance` group in `AdminShell.SECTION_GROUPS`, above Invoices, because
the funnel runs that way:

```
FINANCE   Quotations · Invoices · Expenses · Departures · Reports
```

`isCurrentSection` already keeps the parent lit on `/admin/quotations/<id>`.

### The arithmetic is pure and tested

`src/lib/quotations.ts` imports no Supabase for its pure half and no catalogue at all, so
`resolveQuoteDiscount`, `perPersonPaise`, `defaultPax`, `isExpired`, `quotationPdfPath` and
`rupeesToPaise` are testable in isolation — the same rule and the same reason as
`src/lib/finance.ts`.

---

## Build order

| Phase | What shipped |
|---|---|
| **0 ✅** | This document |
| **1 ✅** | `024_quotations.sql` — tables, constraints, `send_quotation()`, `bump_quotation_revision()`, the view, RLS, bucket |
| **2 ✅** | `src/lib/quotations.ts`, `money.ts#rupeesToPaise`, `quotations.test.ts` (34 cases) |
| **3 ✅** | `packages.client.ts`, `PackagePicker.tsx`, `packages.client.test.ts` (14 cases) |
| **4 ✅** | `QuotationDocument.tsx`, `renderQuotation.ts`, `scripts/pdfMeasure.mts`, `scripts/render-quotation-check.mts` (16 cases) |
| **5 ✅** | `AdminQuotationsPage`, `QuotationEditor`, sidebar entry, business-settings fields |
| **6 ✅** | "Quote" on `/admin/enquiries` and `/admin/meta-ads`; "Convert to invoice" |

Phase 2 before 3, and 4 before 5, were the two orderings that mattered: the arithmetic had to be
right before any UI depended on it, and the document had to exist before the editor could know
what to collect.

### Verifying it

```powershell
npx tsc --noEmit
npm run lint
npm test                      # 93 cases, including quotations + packages.client
npm run test:pdf              # the invoice document, unchanged
npm run test:quotation:pdf    # the quotation document
npm run build
npm run sample:pdf -- .	mp   # then look at the result by eye
```

Plus the Decision 1 grep above, which must return nothing.

---

## Deviations, as built

- **`revision` counts sends, not edits.** The first draft of Decision 6 had a trigger bumping the
  revision on any material change, with a statement-level trigger and transition tables on
  `quotation_items` so a five-line edit was not counted as five revisions. Replaced by counting
  sends, which needs no trigger, no hand-maintained column list, and prints a number the customer
  has actually received. Decision 6 is rewritten around this.
- **`ratesForPackage` accepts both price-key shapes.** Found while checking the real seed data
  rather than the TypeScript type: migration 003 wrote `packages.prices` keyed by tier display
  name, 006 re-keys to stable keys. Looking up only `tier.key` returned **zero rates, silently**
  for a row still in the old shape. See the settled question below.
- **The quotation is not held to one page.** The invoice is, because it is a bill sent over
  WhatsApp. This document carries inclusions, exclusions and an annexure, so two pages is a
  reasonable quotation and the check allows it per case. What the check does enforce is stronger
  and more specific: the price is on page one, and the per-person figure is on the same page as
  the total it comes from.
- **Two font sizes exist to be measurable.** The grand total is 11.5pt and the per-person band
  10.5pt, both used nowhere else in the document. Both were 11pt first — which is also what
  `baseStyles.strongLine` sets the customer's name to, so "is the total on this page?" came back
  true on the strength of the name. Half a point buys a layout the checker can reason about.
- **`scripts/pdfMeasure.mts` is new.** The invoice checker's content-stream measurement helpers
  were extracted so both checkers share them. They encode hard-won facts about what
  `@react-pdf/renderer` emits, and a second copy is how one checker would quietly stop testing
  what the other still does. `render-invoice-check.mts` passes unchanged against the extraction.
- **`uploadPdfOnce` gained a `bucket` parameter** rather than being copied, so the "already exists
  means this is that document" argument stays in one place.
- **`pdfSafeBusiness` moved** from `renderInvoice.ts` into `pdfSafeImage.ts`, so both renderers
  share it instead of diverging on how they handle a bad logo.

---

## Risks and open questions

**Settled in phase 3**

1. **`packages.prices` can be keyed either way.** The seed in migration 003 wrote it keyed by
   tier *display name* (`"Silver"`); migration 006 re-keys to stable keys (`silver`) and drops
   anything it cannot match. `TierPriceMap` in `src/app/components/packageData.ts` is still
   typed by display name and is therefore wrong about re-keyed rows. `ratesForPackage` in
   `src/lib/packages.client.ts` accepts **both** forms, preferring the stable key, and always
   reports the tier under its key with its display name resolved through
   `tierName(key, registry)` — the same hedge `lowestTier()` already makes. A row in the old
   shape would otherwise come back with **zero rates, silently**, which is the failure a type
   that lies about the data buys you. Fixing `TierPriceMap` itself is a public-site change and
   stays out of scope; `packages.client.ts` declares its own honest `CataloguePrices` type.

**Still open**

2. Sharing labels (`Quad`, `Triple`, `Quint`, `Child(6-11)`, `Infant(0-2)`) are free-form jsonb
   keys with no registry behind them. The picker lists whatever is present, which is right, but
   it means a typo in `/admin/packages` becomes a line description on a customer-facing
   quotation. A sharing registry beside `package_tiers` is the fix if it ever bites.

**Known risks**

- **The `lineHeight` trap.** `@react-pdf/renderer` resolves a unitless `lineHeight` against the
  `fontSize` in the *same style object* and the absolute result inherits, so any style that sets
  `fontSize` must restate `lineHeight` beside it. `QuotationDocument` has more type sizes than the
  invoice (the per-person band, two inclusion lists), so it has more chances to get this wrong.
- **Nothing throws when a PDF's layout is wrong.** An overlapping header or a dropped policy block
  produces a perfectly valid file. `render-quotation-check.mts` must measure the content stream and
  assert page counts from **both** ends, as `render-invoice-check.mts` does — and
  `npm run sample:pdf` exists because some of this only shows up to an eye.
- **The missing `₹` glyph.** Closed for the invoice by committing Noto Sans, and inherited here
  through `src/lib/pdf/fonts.ts`. It stays on the list because the failure mode is silent
  substitution, not an error. The same font has no glyph for `★`, which vanishes from typed
  descriptions — and package names in this catalogue contain `4★`. The picker should strip or
  translate it when composing a line description.
- **Pressure to make the invoice editor read the catalogue too.** Having built the picker, "why
  can't the invoice do that" is the next question. The answer is Decision 1: because an invoice is
  a record. Keep the grep in review.
- **`quotation_overview` and `isExpired()` drifting apart.** The same hazard as `fy_label()` and
  `fyLabel`. Comment them as a pair, and if one changes, both change.
- **Nothing here is a backup.** The same single point of failure as the rest of the finance set.
