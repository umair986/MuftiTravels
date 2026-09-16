# Expense Tracker & Invoice Generator

**Status:** Built, phases 0–4. Migrations 017–019.
**Written:** 31 August 2026
**Depends on:** migrations 001–016, `public.is_admin()` (migration 008), the `AdminShell` sidebar (`src/app/admin/AdminShell.tsx`)

> This began as a decision document and is now also the record of what was built.
> Where implementation diverged from the plan, the plan text was corrected rather
> than left standing — see **Deviations from this plan, as built** near the end.

---

## What this is for

Two features were asked for. They are worth building as **one system**, because on their own each is half a tool:

| Built alone | What you get | What is still missing |
|---|---|---|
| Expense tracker only | A ledger. "We spent ₹6.9L in March." | No idea whether that was profitable. |
| Invoice generator only | A PDF factory. "Here is a bill." | No idea whether the bill was ever paid. |
| Both, sharing a spine | Money in, money out, per departure | — |

The spine is three things the two features have in common and must agree on:

1. **One money representation** (integer paise, never floats).
2. **One optional link to a departure** (`trip_id`), so revenue and cost can meet.
3. **One record of payments received**, because Umrah is sold on advance-plus-balance, not on a single settlement.

Get those three right in the first migration and the reporting in Phase 4 is a `select`. Get them wrong and it is a data migration on live financial records.

---

## The single most important design rule

> **An issued invoice is a historical fact, not a view of current data.**

Every field a customer sees on the PDF — their name, the package title, the price, your GSTIN, your address — is **copied onto the invoice row at the moment it is issued**. Nothing on an issued invoice joins live to `public.packages` or to a customer record.

This is not paranoia. Concretely: a package price is edited in `/admin/packages` in November. Without snapshotting, every invoice raised against that package in April silently changes its total. You now have PDFs in customers' WhatsApp that disagree with your own database, and no way to tell which was right. Under GST an issued invoice also cannot be edited at all — it is cancelled and reissued, or corrected with a credit note.

So: `invoice_items` stores **text and amounts only** — no foreign key to `packages`, not even one kept "just for reporting". Decision 5 takes this further: the invoice generator does not know the catalogue exists at all.

The same rule applies to expenses to a lesser degree — a category rename is fine to follow live, which is why `expenses.category_id` is a real FK with `on delete restrict`.

---

## Decision 1 — How the PDF is generated

This is the question in the request ("invoice should be generated in pdf always"), so it gets the fullest treatment.

### The options

| | Approach | Cost | Fidelity | Verdict |
|---|---|---|---|---|
| **A** | `@react-pdf/renderer` in the browser | ₹0 | Deterministic, its own layout engine | **Chosen** |
| **B** | `jsPDF` + `jspdf-autotable` | ₹0 | Imperative x/y positioning | Rejected |
| **C** | Headless Chrome on the server (Puppeteer + `@sparticuz/chromium`) | Vercel function time | Perfect — it is real CSS | Rejected |
| **D** | Styled HTML route + `window.print()` | ₹0 | Browser-dependent | Rejected |
| **E** | Hosted API (DocRaptor, PDFMonkey, APITemplate) | Recurring subscription | Perfect | Rejected |

### Why A

- **Real layout engine.** You describe the invoice as React components with a flexbox-like stylesheet; it paginates, it wraps, it repeats table headers across pages. A 40-passenger group invoice that runs to three pages just works. With B (jsPDF) you are computing "if y > 780 then addPage()" by hand, and it will be wrong for exactly the invoice you cannot afford to get wrong.
- **No server, so no new attack surface.** The admin's browser already holds the invoice data — RLS handed it over. Generating the PDF there adds *zero* new authenticated endpoints. Option C requires a route that takes an invoice id and returns a document; that route has to re-authenticate and re-authorise, and if it ever gets that wrong it leaks a customer's bill.
- **Matches an existing pattern in this codebase.** `src/lib/metaLeads.ts` already dynamic-imports `xlsx` (~1 MB) so it stays out of the admin bundle until someone picks a file. The invoice renderer is imported the same way — the cost is paid only by the person clicking "Generate PDF".

### Why not the others

- **B (jsPDF)** is smaller but the multi-page arithmetic is manual, and `jspdf-autotable` re-adds most of the weight you saved.
- **C (Puppeteer)** is the highest fidelity and I would pick it if this were a report with charts. For an invoice it is not worth a ~50 MB Chromium layer, cold starts of several seconds, and Vercel function limits, to render a table with a total at the bottom.
- **D (`window.print()`)** cannot satisfy "always PDF". The browser adds its own header and footer, the filename is not yours to set, Safari and Chrome disagree on margins, and on mobile the user may get a share sheet instead of a file. It is a fallback, not a feature.
- **E** is a recurring vendor cost for something that runs fine locally, and it means posting customer names and phone numbers to a third party. If it ever becomes the answer it gets its own decision document first.

### The two things that will bite you in A

**1. The rupee sign does not render — and it fails silently.** `@react-pdf/renderer`'s built-in fonts are the PDF core set (Helvetica, Times, Courier), which use WinAnsiEncoding. U+20B9 `₹` has no slot in it.

**Measured in Phase 0**, by inflating the content stream of a rendered PDF:

| Font | Text drawn for `₹100` | What it means |
|---|---|---|
| Core (Helvetica) | `<b9313030>` | `0x20b9` truncated to the byte `0xb9` — **WinAnsi for `¹`**, so the invoice reads `¹100` |
| Noto Sans, registered | `<0001000200030003>` | Real two-byte glyph ids: `₹`, `1`, `0`, `0` |

This is worse than a missing-glyph box. A box gets noticed; `¹100` is a plausible-looking character that survives a review and reaches a customer. Fix:

```
public/fonts/NotoSans-Regular.ttf     (556 KB, from fonts.gstatic.com)
public/fonts/NotoSans-SemiBold.ttf    (558 KB)
```
```ts
Font.register({ family: "Noto Sans", fonts: [
  { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
  { src: "/fonts/NotoSans-SemiBold.ttf", fontWeight: 600 },
]});
```

Both files are committed. Note what subsetting does and does not do here: **`@react-pdf/renderer` subsets what it embeds** — the four-glyph test PDF grew by only ~1.4 KB — but the *browser* still downloads the full 556 KB face to do it. That is acceptable for an admin-only screen behind a dynamic import and an HTTP cache, and it is not acceptable on a public page, which is another reason the renderer never leaves `/admin`.

`src/lib/finance.test.ts` pins the code point so a well-meaning swap to `"Rs."` fails a test rather than changing every invoice, and **`npm run test:pdf`** renders the real `InvoiceDocument` and asserts the drawn text uses embedded glyph ids rather than WinAnsi bytes — the only check that actually catches this.

**2. React 19 compatibility — verified.** `@react-pdf/renderer` **4.9.0** declares `react: ^19.0.0` and was confirmed in Phase 0 rendering a real PDF under React 19.1.0 (`%PDF-` header, 1,608 bytes). Pinned in `package.json`. The jsPDF fallback is not needed.

### Logo and signature in the PDF

`@react-pdf/renderer` fetches `<Image src>` over the network, which means CORS and a possible race on a slow link. Both images are small and change roughly never, so store them **as base64 data URIs** in `business_profile` rather than as storage paths. One less thing that can fail silently at the moment someone is waiting on a bill.

### What happens to the generated file

On **issue**, the PDF is generated once and uploaded to a **private** `invoices` storage bucket, and its path saved to `invoices.pdf_path`. From then on that file *is* the invoice — re-downloading fetches it rather than re-rendering it. This matters because a re-render six months later picks up a new logo, a new address, a tweaked template, and quietly produces a document that does not match the one the customer holds.

It also solves sending. You cannot attach a file to a `wa.me` link. But you can create a **time-limited signed URL** (say 7 days) and put that in the WhatsApp message — which is how the enquiry and Meta-lead screens already talk to customers.

---

## Decision 2 — Money is stored as integer paise

`amount_paise bigint`, never `numeric`, never a float.

- Floats cannot represent ₹0.10 exactly. Sum 300 line items and the total drifts. On an invoice that is a customer-facing error.
- `numeric(12,2)` is exact in Postgres but arrives in JavaScript as a `number` (or a string, depending on driver settings), and every piece of arithmetic in the UI is back to floating point.
- Integer paise is exact end to end. A ₹50 lakh invoice is 5,000,000,000 paise — comfortably inside `Number.MAX_SAFE_INTEGER` (9.007e15), so plain JS numbers are safe. Store as `bigint` in Postgres anyway; it costs nothing and removes the ceiling as a thing to think about.

All parsing, formatting and Indian-grouping (`12,34,567`) lives in one module, `src/lib/money.ts`, and nothing else formats currency.

That module also needs **number-to-words in the Indian system** — "Rupees Eight Lakh Forty Thousand Only" is conventional on Indian invoices and expected by anyone filing them. Lakh/crore, not million/billion. About 40 lines, no dependency.

---

## Decision 3 — Invoice numbering

### Format

```
MT/26-27/0042
```

`{prefix}/{financial year}/{zero-padded sequence}`

Constraints this satisfies, from the GST invoice rules:

- **16 characters maximum.** The example is 13. A longer prefix eats the budget — keep it to two or three letters.
- **Only alphanumerics, `-` and `/`.** No spaces, no `#`.
- **Unique and consecutive within a financial year.** The Indian FY runs 1 April → 31 March, so `fy_label('2026-08-31') = '26-27'`.
- The series **resets to 1 on 1 April**.

### Numbers are assigned at issue, not at creation

An invoice is created as a **draft with no number**. The number is allocated in the same transaction that flips it to `issued`.

If numbers were handed out at creation, every abandoned draft would leave a permanent hole in a series that is legally supposed to be consecutive — and you would have to explain each one.

### Allocation must be atomic

Two admins clicking "Issue" at the same instant must not get `MT/26-27/0042` twice. So allocation is not "select max + 1" from the app; it is a counter row updated in place inside a `SECURITY DEFINER` function:

```sql
update public.invoice_counters
   set next_seq = next_seq + 1
 where fy_label = v_fy
returning next_seq - 1 into v_seq;
```

`update ... returning` takes a row lock; the second caller waits and gets the next value. The unique index on `invoices.number` is the backstop if that reasoning is ever wrong.

### Issued invoices are never deleted

`status` moves `draft → issued → cancelled`. Cancellation records `cancelled_at` and a reason; the number stays burned. Deleting an issued invoice would break the consecutive series, which is precisely the thing the series exists to prove.

---

## Decision 4 — GST: build the shape, confirm the rates

**This section needs your CA's sign-off before Phase 2 ships. Rates and thresholds change, and I do not know your registration status.**

What the schema must support regardless of the answer:

- **Two invoice modes.** A GST *tax invoice* (with GSTIN, SAC, tax breakdown) and a *bill of supply* / plain invoice for when GST does not apply. `tax_mode` covers this: `none | cgst_sgst | igst`.
- **The intra-state / inter-state split.** Supply within your own state is CGST + SGST at half the rate each; across state lines it is IGST at the full rate. This is decided by comparing your state code to the customer's **place of supply**, which is why `customer_state_code` is on the invoice and not optional for GST mode.
- **SAC code per line.** Tour operator services sit under SAC 9985 (998555 for tour operator services specifically). Store it per line item — a package line and an air-ticket line may differ.
- **Rate stored in basis points** (`tax_rate_bp integer`; 500 = 5%, 1800 = 18%), so a fractional rate never needs a float.
- **A round-off line.** GST invoices round the final payable to the nearest rupee. Store `round_off_paise` explicitly (it can be negative) rather than fudging the total, so `taxable + tax + round_off = total` always holds and can be asserted in a CHECK constraint.

Questions to take to your CA, listed so they are asked once:

1. Are you registered? (Services threshold is commonly cited as ₹20 lakh turnover, lower in special-category states — confirm current.)
2. Tour packages: 5% without input tax credit, or 18% with? These are different business decisions, not just different numbers.
3. Air ticket commission — taxed differently from a package?
4. Outbound / non-resident pilgrims — different treatment?
5. Do you need a TCS-on-overseas-tour-package line under section 206C(1G)? If yes it is another column and another figure on the PDF.

Until those are answered, build with `tax_mode = 'none'` as the default and the columns in place.

---

## Decision 5 — Every field on the invoice is a typed input

**The invoice generator does not know that `public.packages` exists.**

No package picker, no "insert package" dropdown, no `package_id` column on `invoice_items`. A line item is a description, a SAC code, a quantity and a rate — all typed, all editable, right up until the invoice is issued.

This is a deliberate constraint and the right one for this business:

- **Package names change constantly.** "Umrah 14 Days – Deluxe" becomes "Umrah 14 Nights – Deluxe (Ramzan)" and then something else next season. A linked invoice either drags the new name onto an old bill or needs the snapshot machinery anyway — so the link buys nothing and costs a coupling.
- **Much of what gets billed is not a package at all.** A standalone visa job, an extra night in Madinah, a Ziyarat add-on, a group of nine where three paid a different rate, a discount agreed on the phone. None of these exist as catalogue rows, and none of them should have to.
- **The catalogue serves the public website.** It is edited for marketing reasons — wording, seasonal framing, tier names. Coupling billing to it makes a copy tweak on the website a change to accounting data.

So the coupling is not "avoided where possible", it is **absent**: nothing under `src/lib/invoices.ts` or `src/lib/pdf/` imports from `src/lib/packages.ts`. That is a reviewable rule, not a preference.

### Free text is flexible but tedious — two things fix that

Typing `Umrah Package · 14 Days · Deluxe · Makkah 4★ (Nov 2026 departure)` on every invoice is how a good rule turns into a bad experience. Two shortcuts, both of which produce **ordinary editable text** and leave no link behind:

**1. Line presets.** A small table of saved snippets the admin maintains themselves:

```sql
create table if not exists public.invoice_line_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,                       -- what the picker shows
  description text not null,                 -- what gets inserted into the line
  sac_code text not null default '',
  default_unit_price_paise bigint not null default 0,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

Picking one **copies** its text and rate into the line and then forgets about it. Editing the line does not touch the preset; editing or deleting the preset does not touch any invoice, draft or issued. It is a keyboard shortcut with a table behind it, not a relationship — which is exactly why it does not reintroduce the problem this decision exists to avoid.

Seeding it with today's package names is fine. They are strings from that moment on.

**2. Duplicate invoice.** "Duplicate as new draft" on any invoice copies the customer block, the line items and the tax settings into a fresh unnumbered draft. For a business that bills the same shape of trip repeatedly to different pilgrims, this is the highest-value shortcut on the screen and it costs almost nothing to build.

### What this removes from the schema below

- `invoice_items.package_id` — **gone.** It was in the first draft of this plan "for reporting only"; a column that is never read is a column that will eventually be read.
- `trips.package_id` — **gone**, same reasoning. A trip is a typed name and a date.
- `invoices.trip_id` — **kept**, but it is a *tag*, not a link. Nothing it points at ever appears on the PDF; it exists only so Phase 4 can sum revenue and cost for one departure. `trip_id = null` is completely normal and the invoice screen works without ever setting it.

---

## Decision 6 — Where the customer comes from

**No `customers` table in v1.**

Customer details are snapshotted onto the invoice (see the rule at the top), plus two nullable back-references:

```sql
source_enquiry_id   uuid references public.enquiries  (id) on delete set null,
source_meta_lead_id uuid references public.meta_leads (id) on delete set null,
```

Which gives you the flow that actually matters: an admin working `/admin/enquiries` or `/admin/meta-ads` hits **"Create invoice"** on a row and lands in a draft with name, phone and email already filled. The lead-to-bill path is two clicks and no retyping.

Consistent with Decision 5, that prefill is a **one-time copy into editable inputs**. The draft never reads the enquiry again, correcting a misspelled name on the invoice does not touch the enquiry, and the two ids are kept purely to answer "did this lead convert?".

A real `customers` table earns its place when you want repeat-pilgrim history and a per-customer statement. That is a later conversation, and it is additive — the snapshot columns stay either way.

---

## Decision 7 — `trips`, and why it is worth the extra table

A departure. `Umrah · Delhi · 12 Mar 2027` — a typed name, like everything else. Nullable FK from both `expenses` and `invoices`.

Without it you have two ledgers that never meet. With it, one query answers the question the business actually asks:

> That Delhi batch — ₹8.4L billed, ₹6.9L spent. Did we make money on it?

The table itself is tiny: a typed name, a category, a departure date, a status. No `package_id` — per Decision 5, the trip name is typed too. **The nullable `trip_id` column goes into the very first migration even though the UI for it ships in Phase 4** — adding a nullable column to an empty table is free; backfilling it across a year of live expense rows is not.

Operating costs (rent, salaries, Meta ad spend) simply leave `trip_id` null. That is why `expense_categories.kind` distinguishes `trip` from `operating`: it keeps the P&L honest about which costs a departure should actually carry.

---

## Decision 8 — Policies on the invoice are a snapshot, not a lookup

**Added after the first build. Migration `021_invoice_policies.sql`.**

The payment policy, the cancellation policy and the travel notes already exist once, in `site_content_lists` (migration 011), and every package page renders them. A customer holding a bill should be holding the same terms — a PDF is the document they keep, not the web page they happened to read in March. So the invoice carries them, on a page of their own behind the bill.

The question is what "carries" means, and there are only two answers:

| | |
|---|---|
| **A. Read `site_content_lists` at render time** | One source of truth, no new column. But editing the cancellation policy in the dashboard then silently rewrites the terms attached to *every invoice ever issued* — including ones already in dispute, which is exactly when somebody reprints an old bill. |
| **B. Freeze the text onto the invoice at issue** ✅ | One extra `jsonb` column. The terms an invoice states are the terms that were published the day it was issued, permanently. |

B, for the same reason 017 has immutability triggers at all: an issued invoice is a historical fact. Amounts, customer and number were already frozen; leaving the cancellation policy free to change afterwards would have made the policy the one part of a bill a later edit could quietly rewrite. **`policy_snapshot` is frozen by the same `guard_issued_invoice()` trigger as everything else** — the application is careful, but the application is not the last word.

Three details that follow from B:

- **The snapshot is taken inside `issue_invoice()`**, in the statement that burns the number. There is then no window in which an invoice is numbered but its terms were never captured, and no way for a browser to send different text than the site publishes.
- **A draft has no snapshot and previews the live lists.** That is the point: the preview shows what issuing is about to freeze. `src/lib/siteContent.ts`'s `invoicePolicyLists()` and SQL's `invoice_policy_lists()` must therefore agree, and they are commented as a pair.
- **`show_policies` is per-invoice.** A standalone visa fee or a ticket reissue has no business carrying nine clauses about departure dates, and an admin who cannot turn them off will stop using the feature.

Inclusions are deliberately *not* printed. What a package covers is described by the invoice's own line items, and a generic inclusions list printed beside hand-typed lines is an invitation for the two to contradict each other — on the one document where that contradiction is expensive.

The annexure sits behind a `break`, so the bill stays one page and the amount due is never pushed under thirty lines of terms. `scripts/render-invoice-check.mts` counts the 8pt runs in the rendered file against the clauses that went in, because a block that overruns its page is dropped silently rather than throwing — and a cancellation clause the customer never received is worse than one never offered.

**The per-invoice terms panel is gone with it.** `invoices.terms` and `business_profile.invoice_terms` both existed to fill one small box in the PDF footer with a sentence of payment terms. The annexure says all of that and says it properly, so the box was a worse copy of a better page — and two different answers to the same question on one document. The textarea, the business-wide default and the panel were all removed in migration 022. **The columns stay**, commented as deprecated: they hold text that was printed on invoices already sent, and dropping them would destroy that to tidy a schema.

---

## Decision 9 — "Paid" on the invoice is a flag the admin sets, not a sum

**Added after the first build. Migration `022_invoice_paid_flag.sql`.**

The bug that forced this: a payment was recorded, the **receipt** correctly stamped itself PAID — and the **invoice** PDF went on saying nothing at all about payment, because that file was rendered and frozen at issue, before any payment existed. Two documents about the same money, disagreeing, and nothing anywhere noticed.

The obvious fix is to make the invoice read `invoice_balances` like the receipt does. That is the wrong one:

- The issued invoice PDF is **frozen in storage**. Deriving a balance changes only what a re-render would say, not the file the customer holds — so the two would still disagree, just less visibly.
- Mufti Travels sends the invoice **once the money has cleared**; part payments are what receipts are for. A running balance on the bill is noise on the common path.
- A derived line has to stay true forever. An invoice printed in 2027 must not start showing a different balance because the ledger moved on.

So `paid_in_full` is a boolean the admin ticks, and the invoice states one thing: **PAID with "no dues"**, or **"Payment pending"** with the amount. `invoice_balances` still answers *"what is outstanding across the book"*; this answers *"what does this piece of paper say"*. **They are allowed to differ while money is in transit — but never silently: the editor shows a warning line whenever the tick and the ledger disagree**, which is exactly the surprise that started this.

The receipt is deliberately left alone. It settles from its own ledger, because a statement of account that stamped PAID over an outstanding balance would be worse than the bug being fixed.

Two consequences worth knowing:

- **The flag is editable after issue**, unlike the amounts and the customer block — it is not in `guard_issued_invoice()`'s frozen set. Whether the money arrived is a later fact about the world, not part of the document's content; same reasoning as `trip_id`.
- **Ticking it writes a second PDF, never a replacement.** The invoices bucket has no update policy on purpose, so `invoicePdfPath()` takes the paid state and a settled invoice stores as `…-paid.pdf`. The file the customer was already sent still opens from the link they were given, which is correct — it is what they were sent.

The bill must stay **one page**; it is sent over WhatsApp, and a second page holding a signature block and nothing else is a worse document to receive. Adding the payment band spilled it twice — once for the band, once for the no-dues line — and both times nothing complained, so `render-invoice-check.mts` now asserts the page count from *both* ends (`minPages` and `maxPages`). Recovering the space is what turned the amount-in-words and notes blocks into single rows.

---

## Schema

One migration, `supabase/migrations/017_finance.sql`, written in the house style — heavily commented, `if not exists` throughout, safe to run more than once.

### `business_profile` — one row, everything the PDF header needs

```sql
create table if not exists public.business_profile (
  id smallint primary key default 1 check (id = 1),   -- exactly one row, enforced
  legal_name text not null default 'Mufti Travels',
  trade_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  state_code text not null default '',                -- GST state code, e.g. '27'
  pincode text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  gstin text not null default '',
  pan text not null default '',
  -- Bank block printed on the invoice so a customer can transfer without asking.
  bank_name text not null default '',
  bank_account_name text not null default '',
  bank_account_number text not null default '',
  bank_ifsc text not null default '',
  upi_id text not null default '',
  -- Base64 data URIs, not storage paths: see "Logo and signature in the PDF".
  logo_data_uri text not null default '',
  signature_data_uri text not null default '',
  invoice_prefix text not null default 'MT'
    check (char_length(invoice_prefix) between 1 and 4),
  invoice_terms text not null default '',
  default_tax_mode text not null default 'none'
    check (default_tax_mode in ('none','cgst_sgst','igst')),
  default_tax_rate_bp integer not null default 0
    check (default_tax_rate_bp between 0 and 10000),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.business_profile (id) values (1) on conflict (id) do nothing;
```

### `trips`

```sql
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  -- Typed, not chosen from the catalogue. See Decision 5.
  name text not null,
  category text not null default '',        -- 'umrah' | 'hajj' | 'ramzan' | 'ziyarat'
  departure_date date,
  return_date date,
  status text not null default 'planned'
    check (status in ('planned','running','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

### `expense_categories` and `expenses`

```sql
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- 'trip' costs belong to a departure; 'operating' costs are the business
  -- itself. Keeps per-departure margin from absorbing the office rent.
  kind text not null default 'trip' check (kind in ('trip','operating')),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  trip_id uuid references public.trips (id) on delete set null,
  vendor text not null default '',
  description text not null default '',

  -- Canonical amount, always INR, always integer paise.
  amount_paise bigint not null check (amount_paise > 0),

  -- Makkah/Madinah hotels and ground transport get billed in SAR. Keep what was
  -- actually paid alongside the INR figure, so a later query against the bank
  -- statement reconciles instead of arguing with a rate nobody wrote down.
  original_currency text not null default 'INR'
    check (char_length(original_currency) = 3),
  original_amount_minor bigint,
  fx_rate numeric(14,6),

  payment_method text not null default 'bank'
    check (payment_method in ('cash','bank','upi','card','cheque','other')),
  reference text not null default '',        -- bill / voucher / UTR
  receipt_path text not null default '',     -- private bucket object path
  notes text not null default '',

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Soft delete. Financial rows do not vanish; a mistake is retracted, not erased.
  deleted_at timestamptz
);

create index if not exists expenses_spent_on_idx
  on public.expenses (spent_on desc) where deleted_at is null;
create index if not exists expenses_category_idx
  on public.expenses (category_id, spent_on desc);
create index if not exists expenses_trip_idx
  on public.expenses (trip_id) where trip_id is not null;
```

Seed categories: Hotel – Makkah, Hotel – Madinah, Visa, Air ticket, Ground transport, Food, Ziyarat, Guide / Muallim, Salaries, Office rent, Marketing – Meta ads, Bank charges, Miscellaneous.

### `invoices`, `invoice_items`, `invoice_payments`, `invoice_counters`

```sql
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  -- Null while draft. Allocated by issue_invoice() and never reused.
  number text unique,
  fy_label text,                             -- '26-27'
  seq integer,
  status text not null default 'draft'
    check (status in ('draft','issued','cancelled')),

  issue_date date,
  due_date date,

  -- Customer snapshot. Deliberately duplicated, never joined. See the rule at
  -- the top of this document.
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_address text not null default '',
  customer_state text not null default '',
  customer_state_code text not null default '',   -- GST place of supply
  customer_gstin text not null default '',

  -- Provenance only, and only ever written once at creation. Nothing on the
  -- rendered document is read back through either of these.
  source_enquiry_id uuid references public.enquiries (id) on delete set null,
  source_meta_lead_id uuid references public.meta_leads (id) on delete set null,
  -- A reporting tag, not a link: nothing it points at appears on the PDF.
  trip_id uuid references public.trips (id) on delete set null,

  -- Money, all integer paise. Denormalised from invoice_items on save so the
  -- list screen and the reports never have to aggregate to show a total.
  subtotal_paise bigint not null default 0,
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  taxable_paise bigint not null default 0,
  tax_mode text not null default 'none'
    check (tax_mode in ('none','cgst_sgst','igst')),
  tax_rate_bp integer not null default 0 check (tax_rate_bp between 0 and 10000),
  cgst_paise bigint not null default 0,
  sgst_paise bigint not null default 0,
  igst_paise bigint not null default 0,
  round_off_paise bigint not null default 0,      -- may be negative
  total_paise bigint not null default 0,
  amount_in_words text not null default '',

  notes text not null default '',
  terms text not null default '',
  pdf_path text not null default '',              -- private bucket, set on issue

  issued_at timestamptz,
  issued_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- The identity that makes the arithmetic checkable at the database level.
  constraint invoices_total_balances check (
    total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise + round_off_paise
  ),
  -- An issued invoice is not allowed to be numberless.
  constraint invoices_issued_has_number check (
    status <> 'issued' or (number is not null and issue_date is not null)
  )
);

-- Every column here is typed by the admin. There is deliberately no package_id
-- and no reference to the catalogue of any kind — see Decision 5.
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  sac_code text not null default '',
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  line_total_paise bigint not null check (line_total_paise >= 0),
  sort_order integer not null default 0
);

create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id, sort_order);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  paid_on date not null default current_date,
  amount_paise bigint not null check (amount_paise > 0),
  method text not null default 'bank'
    check (method in ('cash','bank','upi','card','cheque','other')),
  reference text not null default '',
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoice_payments_invoice_idx
  on public.invoice_payments (invoice_id, paid_on);

create table if not exists public.invoice_counters (
  fy_label text primary key,
  next_seq integer not null default 1
);
```

`invoice_line_presets` (DDL in Decision 5) belongs to this same migration. It is the only table in the finance set that no other table references — by design.

### Payment status is derived, not stored

```sql
create or replace view public.invoice_balances as
select
  i.id,
  i.total_paise,
  coalesce(sum(p.amount_paise), 0)                      as paid_paise,
  i.total_paise - coalesce(sum(p.amount_paise), 0)      as balance_paise,
  case
    when i.status <> 'issued'                              then i.status
    when coalesce(sum(p.amount_paise), 0) = 0              then 'unpaid'
    when coalesce(sum(p.amount_paise), 0) >= i.total_paise then 'paid'
    else 'partial'
  end as payment_status
from public.invoices i
left join public.invoice_payments p on p.invoice_id = i.id
group by i.id;
```

A stored `is_paid` flag is one more thing to keep in sync and to be wrong. Payments are few per invoice; the aggregate is cheap.

### Financial-year helper and atomic issue

```sql
-- Indian FY: 1 April to 31 March. 2026-08-31 -> '26-27'; 2027-02-10 -> '26-27'.
create or replace function public.fy_label(d date)
returns text language sql immutable as $$
  select case when extract(month from d) >= 4
    then to_char(d, 'YY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YY') || '-' || to_char(d, 'YY')
  end;
$$;

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
begin
  -- SECURITY DEFINER bypasses RLS, so the admin check is made explicitly.
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  if not exists (
    select 1 from public.invoices where id = p_invoice and status = 'draft'
  ) then
    raise exception 'invoice % is not a draft', p_invoice;
  end if;

  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice) then
    raise exception 'invoice % has no line items', p_invoice;
  end if;

  v_fy := public.fy_label(p_issue_date);
  select invoice_prefix into v_prefix from public.business_profile where id = 1;

  insert into public.invoice_counters (fy_label, next_seq) values (v_fy, 1)
  on conflict (fy_label) do nothing;

  -- Row lock: a concurrent issue waits here and receives the next value.
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
         updated_at = timezone('utc', now())
   where id = p_invoice;

  return v_number;
end $$;

revoke all on function public.issue_invoice(uuid, date) from public;
grant execute on function public.issue_invoice(uuid, date) to authenticated;
```

### RLS and storage

Every one of these tables is admin-only in both directions — the same shape as `meta_leads` in migration 015. No anonymous path exists at all; nothing on the public site reads or writes finance data.

```sql
alter table public.<each> enable row level security;

drop policy if exists "Admins manage <each>" on public.<each>;
create policy "Admins manage <each>" on public.<each> for all to authenticated
using (public.is_admin()) with check (public.is_admin());
```

Two **private** storage buckets — `expense-receipts` and `invoices`. Not public like `package-images`: these are bank references, vendor bills and customer billing addresses. Access is via short-lived signed URLs only.

Apply the same upload hardening migration 016 introduced for the gallery: size cap, MIME allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), admin-only insert/update/delete.

---

## Application layout

```
src/lib/
  money.ts                  parse / format paise, Indian grouping, number-to-words
  finance.ts                shared types, statuses, fy helpers, tax computation (pure)
  expenses.ts               row types, category helpers, query builders
  invoices.ts               row types, draft/issue/cancel operations, totals recompute
  pdf/
    InvoiceDocument.tsx     the @react-pdf/renderer document
    fonts.ts                Font.register for Noto Sans (the ₹ fix)
    renderInvoice.ts        document -> Blob, dynamic-imports the renderer

src/app/admin/
  expenses/
    page.tsx                metadata + route (mirrors meta-ads/page.tsx)
    AdminExpensesPage.tsx   list, filters, totals bar
    ExpenseFormDialog.tsx   create / edit, receipt upload
  invoices/
    page.tsx
    AdminInvoicesPage.tsx   list, status filter, search, outstanding total
    LinePresetPicker.tsx    inserts saved text into a line, then gets out of the way
    [id]/
      page.tsx
      InvoiceEditor.tsx     draft editing, line items, live totals — all free text
      InvoicePreview.tsx    in-browser PDF preview
      PaymentsPanel.tsx     record receipts against the invoice
  finance/
    page.tsx
    AdminFinancePage.tsx    month view, category breakdown, receivables, per-trip P&L
  settings/business/
    page.tsx
    BusinessProfileForm.tsx company details, GSTIN, bank block, logo, signature
    ListsPanel.tsx          expense categories + invoice line presets, one screen
```

Client components throughout, `createClient()` from `@/lib/supabase/client`, `useToast()` for write outcomes, `AdminShell` for chrome — identical to `AdminEnquiriesPage` and `AdminMetaLeadsPage`. There is no new server surface in this plan except the two Postgres functions.

**One import rule worth enforcing in review:** nothing under `src/lib/invoices.ts`, `src/lib/pdf/` or `src/app/admin/invoices/` may import from `src/lib/packages.ts`, `packages.server.ts`, `categories.ts` or `categoryFields.ts`. That single grep is the whole of Decision 5 as a check.

### Sidebar

`AdminShell.SECTIONS` is a flat list of nine. Adding Invoices, Expenses, Reports and Business settings makes thirteen, which is past the point where a flat list scans. **Group the sidebar** while adding them:

```
CATALOGUE   Overview · Umrah Packages · Hajj · Ramzan · Gallery · Tags & Tiers · Inclusions & Policies
LEADS       Enquiries · Meta Ads
FINANCE     Invoices · Expenses · Reports
SETTINGS    Business details
```

A small change to `SECTIONS` (array of groups instead of array of links) and one extra `<p>` per group in the existing `map`. Do it in the same commit as the first finance page, not as a follow-up.

### The tax and totals module is pure and tested

`computeInvoiceTotals(items, discount, taxMode, rateBp)` takes numbers and returns numbers. No Supabase, no React. This is the one piece of code in the project where being wrong is a customer-facing and legally-relevant error, so it should have actual tests.

The repo currently has no test runner. Rather than pulling in Jest or Vitest for one module, add `tsx` as a devDependency and use Node's built-in runner:

```
"scripts": { "test": "tsx --test src/lib/**/*.test.ts" }
```

Cases worth pinning: zero discount; discount larger than subtotal (must clamp, not go negative); 5% and 18%; CGST/SGST halving with an odd paise remainder; the round-off producing a negative value; a three-page item list; and `₹` rendering in the PDF fixture.

---

## Build order

Each phase ends somewhere shippable. Estimates assume the patterns are copied from the existing admin screens, which they should be.

| Phase | What ships | Est. |
|---|---|---|
| **0 ✅** | Migration 017, both storage buckets, `money.ts` + `finance.ts` with tests, sidebar grouping, `@react-pdf/renderer` smoke test | ~0.5 day |
| **1 ✅** | Expenses: list, filters (month / category / trip), create, edit, soft delete, receipt upload, CSV export, totals bar. Business profile form. Categories + line presets list screen. | ~1.5 days |
| **2 ✅** | Invoices: draft editor with every field typed, line items, preset picker, duplicate-as-draft, live totals, issue (atomic numbering), **PDF generation + upload to storage**, download, cancel, WhatsApp signed link. Create-invoice-from-enquiry / from-Meta-lead. | ~2.5 days |
| **3 ✅** | Payments: record receipts, `invoice_balances` wired into the list, outstanding-receivables view, overdue highlighting. Migration 018. | ~1 day |
| **4 ✅** | Trips: CRUD, tagging expenses and invoices to a departure, per-trip P&L, monthly revenue-vs-expense report, category breakdown. Migration 019. | ~1.5 days |

Phase 1 before Phase 2 is deliberate: expenses is the simpler CRUD and it proves the money module, the private-bucket upload path and the new RLS policies **before** the invoice work depends on all three.

If invoices are the more urgent business need, Phases 1 and 2 can swap — but Phase 0 cannot move, and `money.ts` must be tested before either.

---

## The reports screen

Three questions, three forms, chosen by what the reader has to do rather than by what looks impressive:

| Question | Form | Why not something else |
|---|---|---|
| Four headline numbers | KPI row of stat tiles | A four-bar chart of unrelated measures compares things that do not belong on one scale |
| Invoiced against spent, by month | Two series, **one shared scale** | Never two axes — with two scales any pair of lines can be made to tell any story, which is what makes dual-axis the most misleading chart there is. Both figures are rupees, so one scale is also the honest one |
| Where the money went | Ranked horizontal bars, one hue | A dozen categories would need a dozen hues nobody can tell apart; category is the label, length is the encoding |

The two-series palette is validated rather than eyeballed — gold `#997A15` (invoiced) against blue `#2a78d6` (spent): adjacent CVD ΔE 26.6 protan / 17.4 tritan, normal-vision ΔE 27.6, both inside the lightness band and clearing the chroma floor and 3:1 contrast. Colour is never the only cue in any case: every bar carries its own value label, the legend is always present, and the same numbers appear as table text beside the bars.

---

## Risks and open questions

**Needs your answer before the relevant phase starts**

1. **GST status and rate** — blocks Phase 2's PDF template. Everything else in Phase 2 can be built with `tax_mode = 'none'`.
2. **Legal entity details** — exact legal name, registered address, GSTIN, PAN, bank account. These print on every invoice; getting them wrong means reissuing.
3. **Who may see finance data?** This plan gives every existing admin full access, because `is_admin()` is currently the only role that exists. If a package-editing staff member should *not* see revenue and expenses, that is a second role and a second predicate — say so now, because retrofitting a role across finished policies is worse than writing them once.
4. **Invoice prefix** — `MT` assumed. Under 4 characters.

**Deviations from this plan, as built**

- **Reporting aggregates in the database, not the browser.** Three views in migration 019 (`trip_financials`, `finance_monthly`, `expense_category_totals`). The expenses screen gets away with client-side totals because a period bounds it; "every invoice and every expense ever, grouped" is exactly the shape that should never be shipped to a phone to add up. `trip_financials` aggregates each side in its own subquery before joining — joining invoices *and* expenses to trips in one statement multiplies the rows (five invoices and four expenses give twenty) and every sum comes out silently wrong.
- **Revenue means issued.** Drafts and cancelled invoices are excluded from every report. Counting drafts would let an abandoned quote inflate a departure's margin.
- **Margin is billed minus spent, not received minus spent.** A departure that has run either made money or it did not, regardless of who has paid up. Cash position is a separate `outstanding_paise` column, deliberately not folded into margin.
- **The departure tag is savable after issue.** It is the one field on an issued invoice that stays editable, because nothing it points at reaches the PDF and `guard_issued_invoice` deliberately leaves `trip_id` out of the columns it freezes. Attributing a bill to a batch is bookkeeping, and it usually happens after the bill has gone out — so the editor gives it its own small save action rather than the read-only treatment the rest of the form gets.
- **Deleting a departure releases its rows rather than taking them.** Both FKs are `ON DELETE SET NULL`: the money stays in the books and merely stops being attributed to a batch.

- **`is_overdue` is computed in the view, not the client.** Overdue is a fact about today, and the browser's today is whatever the viewer's device says it is — a laptop with a wrong clock, or an admin travelling, would otherwise disagree with the database about which invoices are late. Migration 018 settles it against `current_date` in one place.
- **The outstanding banner is global, not page-scoped.** It is computed from every issued invoice with money still owed, which is bounded by what is actually outstanding rather than by the whole invoice history. An "outstanding" figure that changed when you turned the page would be worse than showing none.
- **Payments hard-delete; expenses soft-delete.** The immutable record here is the invoice, not the bookkeeping of what has been received against it. A receipt entered against the wrong invoice has to come off it.
- **Overpayment warns rather than blocks.** It is usually a typo and occasionally a customer rounding up. Refusing it outright would make a real situation impossible to record, so the balance is allowed to go negative and the status still reads "paid".

- **An issued invoice is read-only in the UI, not merely discouraged.** The `guard_issued_invoice` trigger rejects any change to the number, amounts or customer block, so the editor disables those fields once issued. Rendering inputs the database would refuse to save would be a lie about what the screen can do.
- **Line items are upserted by client-generated id, then the removed ones deleted.** The obvious "delete all, re-insert" loses the whole invoice if the second half fails, and a browser has no transaction to protect it. This is why `EditableItem` carries an id from the moment it is created rather than waiting for the database to assign one.
- **A failed PDF upload is reported as a failed upload, not a failed issue.** Issuing is irreversible and the number is burned the moment `issue_invoice()` returns, so if the storage write then fails the invoice is genuinely issued and merely lacks its file. The editor shows a "Store PDF" retry rather than implying the issue did not happen.
- **The tax mode auto-resolves but stays editable.** `resolveTaxMode` sets CGST+SGST or IGST from the two state codes as soon as a place of supply is chosen, since that is a rule rather than a preference — but the select is left enabled for the cases the rule does not cover.

- **The expenses list aggregates in the browser, not the database.** `AdminEnquiriesPage` pages in the database deliberately, and this screen does the opposite: it fetches the selected period's rows and totals them in JavaScript. The totals bar has to cover the whole filtered set rather than the page on screen, and PostgREST offers no dependable aggregate to lean on. A period is naturally bounded, so the set stays small — and when it does not, `EXPENSE_FETCH_CAP` (2,000 rows) is reported in a banner rather than silently truncating a total. If volume ever makes that banner routine, the fix is a Postgres function returning the sums, not a bigger cap.
- **Expense categories are deactivated, never deleted.** `expenses.category_id` is `ON DELETE RESTRICT`, so a category with spending against it cannot be removed at all — and should not be, since deleting it would orphan the history that makes last year's totals readable. Line presets *can* be deleted outright, because nothing references them.
- **A cleared receipt leaves its file in the bucket.** Someone clearing an attachment is usually about to attach the right one, and deleting immediately would make a mis-click unrecoverable. The same reasoning applies to soft-deleted expenses. Orphans are invisible and cheap; a lost bill is not.

**Found while verifying against the live database**

Migration 018 carries two fixes to 017, both found by testing rather than by reading:

- **An issued invoice could be deleted.** 017 guards `UPDATE` on `invoices` and every write to `invoice_items`, but nothing guarded `DELETE` on the invoice itself, and the RLS policy is `FOR ALL`. So the number, amounts and customer were all immutable while the whole row could simply be removed — which is precisely the hole in a consecutive series that burning a number on cancellation exists to prevent. 018 adds a `BEFORE DELETE` trigger; drafts stay deletable because they were never numbered. The editor now also scopes its delete with `.eq("status", "draft")`, so a stale tab cannot even ask.
- **A grammar bug in an admin-facing error**: "the line items of a issued invoice".

What the live check confirmed working, unchanged: sequential numbering (`MT/26-27/0001`, `0002`, counter at 3), PDF render → upload → `pdf_path`, all three immutability guards refusing edits to an issued invoice, `unpaid → partial → paid` transitions in `invoice_balances`, the amount CHECK rejecting a zero payment, and a signed URL fetching a 100 KB PDF with no auth header while unsigned access to the same object returns 400.

**Known risks**

- ~~**`@react-pdf/renderer` vs React 19.**~~ Closed in Phase 0: 4.9.0 renders under React 19.1.0.
- **The `₹` glyph.** Closed in Phase 0 and documented above, but it stays on this list because the failure mode is silent substitution to `¹`, not an error. Any future change to the PDF font stack has to be checked against a rendered file, not a preview.
- **Bundle weight.** The renderer plus two full font faces is roughly 1.5 MB. Dynamic-import it exactly the way `metaLeads.ts` imports `xlsx`, so it is paid once, by an admin, on the invoice screen only, and never touches the public site.
- **Nothing here is a backup.** Financial records in one Supabase project is a single point of failure. Confirm point-in-time recovery is on for the plan you are on, and add a monthly CSV export of invoices and expenses to the Reports page — a file the business owns outside the database.
- **Pressure to re-link the catalogue.** At some point "just add a package dropdown so it fills the price in" will sound harmless. It is the same request Decision 5 declines, and the answer is a line preset, not a foreign key. Presets give the same three keystrokes saved without making an accounting record depend on a marketing field.
- **Scope drift.** A `customers` table, recurring expenses, multi-currency reporting, credit notes, e-invoicing / IRN, and Tally export are all plausible next asks. None are in this plan. Credit notes are the most likely to become genuinely necessary if GST registration happens, since that is the legal mechanism for correcting an issued invoice.
