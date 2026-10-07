# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next dev server on :3000
npm run build          # Production build — run this before calling a change done
npm run lint           # eslint via next lint
npx tsc --noEmit       # Typecheck (not wired to a script)

npm test               # Node's built-in runner over src/lib/*.test.ts
npm run test:pdf       # Renders the real InvoiceDocument and asserts 15 properties of the output
npm run sample:pdf -- <outDir>   # Writes 4 sample invoice/receipt PDFs to look at by eye
npm run sample:quotation -- <outDir>  # Writes 3 sample quotation PDFs to look at by eye
```

`npm test` globs `src/lib/*.test.ts`, so a single file is `npx tsx --test src/lib/finance.test.ts`
and a single case is `npx tsx --test --test-name-pattern "computeInvoiceTotals" src/lib/finance.test.ts`.

There are four test files: `finance.test.ts`, because money arithmetic is where a bug is both
customer-facing and legally relevant, `guides.test.ts`, which checks the guide copy parser and
that every guide cites sources, `quotations.test.ts`, which covers the quotation helpers —
discount, per-person, expiry, the description parser, and how costing lines follow the traveller
count — and `departures.test.ts`, which pins when a monthly package expires (midnight IST).
Don't read the absence of tests elsewhere as an invitation to skip them where they'd earn their
keep.

Windows/PowerShell is the primary shell here; a Bash tool is also available and takes POSIX syntax.

## Architecture

Next.js 15 App Router + React 19 + Tailwind v4, backed entirely by Supabase. Two applications
share one codebase:

- **The public marketing site** (`/`, `/packages/*`, `/gallery/*`) — server-rendered, reads
  published content through `src/lib/*.server.ts`.
- **The admin dashboard** (`/admin/*`) — client components talking to Supabase directly from the
  browser, wrapped in `AdminShell`.

### There is no server-side API layer, so RLS is the entire security boundary

`src/app/api/revalidate/` and `src/app/api/send-enquiry/` exist as empty directories and nothing
else does; the only server code is `src/lib/revalidate.ts`, a server action that clears a cache tag.
Every read and write goes **browser → Supabase PostgREST directly**, with
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` shipped in the client bundle by design.

**Anything not enforced by a Postgres policy, constraint or trigger is not enforced at all.**
Client-side validation is advisory — an attacker uses `curl`, not the form. When adding a rule that
matters (who may write, what a column may contain, what may not change after a state transition),
it belongs in a migration, and the UI check is a convenience on top of it. `middleware.ts` gates
`/admin` on an `admin_users` row, but that exists to give a non-admin a clear answer rather than a
dashboard of failed queries — it is not the gate.

`docs/security-audit.md` walks through this and its consequences in detail, and notes that it
audits *the migration files in this repo*, not the live database.

### Supabase migrations are the source of truth

`supabase/migrations/NNN_name.sql`, applied in order, currently up to `026`. House style, and
follow it:

- Heavily commented — the comment explains *why*, including options rejected.
- `if not exists` / `create or replace` throughout, safe to run more than once.
- Business rules live in triggers and functions, not only in TypeScript.

They are applied by hand (Supabase SQL editor / CLI); there is no automated runner. **A change that
adds a column the app writes to will fail at runtime until its migration is applied** — say so when
handing work over.

### Server reads are cached and tagged; admin saves clear the tag

`packages.server.ts` and `gallery.server.ts` wrap their loads in `unstable_cache` with a 1-hour
ceiling and the tags `packages` / `gallery`. After an admin save, call `revalidatePackages()` or
`revalidateGallery()` from `src/lib/revalidate.ts` so the public site updates immediately. A new
cached public read needs a tag and a matching revalidate call, or it will freeze at build time.

`src/lib/supabase/client.ts` returns `null` when env vars are absent, and every caller must handle
that — it is how the site builds without credentials.

### The finance module

`docs/finance-expenses-and-invoicing.md` is the design record: ten numbered decisions, each with
the options rejected. Read it before changing anything under `/admin/invoices`, `/admin/expenses`
or `src/lib/pdf/`. The rules that bite hardest:

**An issued invoice is a historical fact, not a view of current data.** Every field the customer
sees is copied onto the invoice row at issue. `invoice_items` stores text and amounts only — no FK
to `packages`, not even "just for reporting" — and `guard_issued_invoice()` rejects changes to the
number, amounts, customer block and policy snapshot. A handful of columns are deliberately *outside*
that frozen set (`pdf_path`, `trip_id`, `paid_in_full`) because they are later facts about the
world, not part of the document's content.

**Money is integer paise everywhere.** `src/lib/money.ts` is the only module allowed to turn paise
into text or back. Never put a rupee float in the middle of a calculation.

**`src/lib/finance.ts` is pure** — no Supabase, no React, no import from the package catalogue —
so `computeInvoiceTotals` stays testable in isolation.

**Stored PDFs are never overwritten.** The `invoices` bucket has no update policy on purpose. A
document that changes (an invoice once its receipts settle it) gets a *new path* and writes a second
file beside the first; a receipt is stored once, under its own number — see `invoicePdfPath` and
`receiptPdfPath`. The link a customer already holds must go on opening what they were actually sent.

### The invoice PDF

`src/lib/pdf/InvoiceDocument.tsx` renders the invoice and `ReceiptDocument.tsx` the one-page receipt
for a single payment; the letterhead, signature and footer they share live in `shared.tsx`. Both render
in the **browser** — every import in `renderInvoice.ts` is dynamic so the ~1 MB renderer stays out of
every other admin screen, and doing it client-side is what keeps the server surface at zero.

Two traps documented at length in that file and in `scripts/render-invoice-check.mts`:

- **`lineHeight` is not the CSS rule it looks like.** `@react-pdf/renderer` resolves a unitless
  `lineHeight` against the `fontSize` in the *same style object*, and the absolute result inherits.
  Any style that changes `fontSize` **must restate `lineHeight` beside it**, or its glyphs draw over
  the line beneath.
- **Nothing throws when the layout is wrong.** An overlapping header, a policy block that overruns
  its page and is silently dropped, a bill that spills onto a second page — all produce a valid PDF.
  `npm run test:pdf` measures the rendered content stream for exactly these, and asserts page counts
  from *both* ends. Run it after any change to the document, and use `npm run sample:pdf` to look at
  the result with your own eyes.

### Quotations

`docs/quotations.md` is the design record — twelve numbered decisions, same style as the finance
doc. Migrations `024_quotations.sql` and `025_quotation_trip_details.sql`. A quotation is the
priced offer that goes out *before* an invoice exists, and it deliberately inverts four of the
invoice rules:

**A quotation may read the package catalogue; an invoice may not.** This is the one request
Decision 5 of the finance doc names in advance and declines. The resolution is that the coupling is
confined to `src/app/admin/quotations/` — `QuotationEditor.tsx` loads the catalogue once through
`src/lib/packages.client.ts` and hands the list to `PackagePicker.tsx`, which is the only screen that
reads it — and a pick is a one-time copy into editable text, so
`quotation_items` still stores text and amounts only. The Decision 5 grep gains one clause and
otherwise stands:

```powershell
Select-String -Path src/lib/invoices.ts,src/lib/quotations.ts,src/lib/pdf/*,src/app/admin/invoices/* `
  -Pattern "lib/packages|lib/categories|lib/categoryFields"
```

**A sent quotation stays editable, and `revision` counts sends rather than edits.**
`send_quotation()` allocates the number once and bumps the revision on every later call. Each
revision writes its own PDF (`quotationPdfPath`) into a `quotations` bucket that has no update
policy, so the link a customer already holds keeps opening what they were sent. There is no
`guard_issued_invoice()` equivalent and there should not be one.

**The catalogue is in rupees; everything downstream is paise.** `rupeesToPaise` in
`src/lib/money.ts` is the only crossing, and it is called once, in the picker.

**Expiry is derived in SQL**, in `public.quotation_overview`, because the browser's today is the
viewer's device clock. `isExpired()` in `src/lib/quotations.ts` mirrors it for a row already in
hand; the two are a pair.

**The trip is a snapshot too, and none of it is required.** Migration 025 adds what the customer
compares agents on before they reach the price — service, package, sharing, sales rep, duration,
four traveller counts, and `accommodation` as `jsonb` on the row. The hotel is text, never a join,
for the same reason a price is copied rather than linked. Every column defaults to something that
renders as *say nothing*, every block on the PDF is conditional, and the checker proves a
pre-025 row still produces the old document — including a row whose columns are **absent**, which
is what PostgREST returns in the window between a deploy and the migration being applied by hand.

**One priced line may carry a whole itinerary.** `parseDescriptionLines` in
`src/lib/quotations.ts` reads a multi-line `description`: line 0 is the item, two spaces indent a
level (a tab counts as four, depth caps at 3), `**asterisks**` mark a sub-heading. Splitting it
into rows would put a rate beside "Zam Zam Water", so the structure is a rendering convention and
`quotation_items` still stores text and amounts only. That is why the items table is a ruled grid
where the invoice's is a ruled list, and why a zero rate prints blank rather than "₹0".

The totals arithmetic is `computeInvoiceTotals`, reused unchanged — `resolveQuoteDiscount` only
resolves the whole-quote discount in front of it. `npm run test:quotation:pdf` measures the
rendered document; its grand total is 11.5pt, its per-person band 10.5pt and its table head 8.5pt
specifically so the checker can locate or exclude them, so don't "tidy" those to 11pt or 8pt.

### Guides

`/guides` articles are typed data in `src/content/guides/*.ts`, registered in `GUIDES` in
`src/lib/guides.ts` — code, not admin content, because a wrong statement about visas or vaccines
must go through review. Every factual claim cites an official source in the article's `sources`,
and `reviewed` is the date those were last checked; re-check them before bumping it. Copy supports
only `[label](url)` and `**bold**`, rendered as React nodes by `src/app/guides/RichText.tsx`.

### Monthly packages and departure cities

`docs/monthly-packages.md` is the design record (migration `026`). An Umrah package is made
**for a month** (`valid_month`, always the 1st) and **from a city** (`departure_city`, a key from
`DEPARTURE_CITIES` in `src/lib/departures.ts`). The rules that bite:

- **Expiry is the select policy, not a job.** Public reads only see rows whose month is not over,
  computed in IST by `public.current_ist_month()`; `currentIstMonth()` mirrors it in TypeScript
  and the two are a pair. `getPublicCatalog()` also filters *after* its cache. Expired rows are
  never deleted automatically — the business deletes them by hand from the dashboard's alert.
- **The city page is the permanent address.** `/umrah-packages-from-<city>` lists that city's
  current packages newest month first; the home page links to cities, not packages. A missing
  package's detail URL redirects to its city via `package_city_for_slug()`.
- **A seventh city** needs an entry in `DEPARTURE_CITIES`, copy in `CITY_LANDING`, and a route
  file — no migration. Don't claim a direct flight (`direct: true`) the business hasn't confirmed.
- **Code must survive the window before 026 is applied** — rows then lack both keys. See Decision
  10 of the doc before adding a read or write of either column.

### Public catalogue conventions

Packages reference tiers and tags by **stable key** (`super-saver`), never by display name, so a
rename is a one-row update. `src/lib/categories.ts` maps a category to its URL segment and must
stay in step with `PACKAGE_CATEGORIES` in `src/lib/categoryFields.ts` — its comment claims a test
asserts this; that test does not exist, so check by hand.

## Design

`.agents/skills/frontend-design/SKILL.md` carries the full brief. The house look is **rich, not
minimal**: imagery and gold, not editorial whitespace. Brand tokens recur as literals throughout —
gold `#D4AF37` (`#997A15` for text on light), ink `#06131D`, muted `#526168` — with `.font-display`
(Cormorant Garamond), `.font-body` (Plus Jakarta Sans) and `.font-arabic` (Amiri) defined in
`globals.css`. Match the surrounding file rather than introducing a new scale.

## Notes

- `README.md` predates the admin dashboard and Supabase entirely; it describes only the original
  marketing site. Treat `docs/` as current and the README as history.
- `src/lib/pdf/fonts.ts` registers Noto Sans from browser paths (`/fonts/NotoSans-*.ttf`), which is
  why the scripts in `scripts/` re-register it from disk *before* importing `InvoiceDocument` — the
  first registration for a family wins. The font has only Regular and SemiBold: asking for italic
  **throws** at render time. It has no glyph for `★`, `≈` and similar symbols, and those do not
  throw — react-pdf splits the text run and the character is simply absent from the output, with no
  warning and a perfectly valid PDF. One shipped in the quotation's per-person band. The
  `no missing glyphs` check in `render-quotation-check.mts` now scans every non-ASCII character
  hard-coded in `src/lib/pdf/` against both faces' cmaps; it strips comments first, because that
  file and the documents both name the offending characters in prose to explain them.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
