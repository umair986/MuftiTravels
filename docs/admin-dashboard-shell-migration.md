# Admin Dashboard → Sidebar Shell Migration

**Status:** Phases 1–4 implemented on 26 August 2026. Phase 5 not started (optional).
**Written:** 26 August 2026
**Scope:** `src/app/admin/**`, plus one guard in `src/app/components/header.tsx` — see
[Implementation notes](#implementation-notes).

---

## Why

The admin area navigates through `AdminNav.tsx` — a horizontal strip of seven links
that every page renders for itself:

```
src/app/admin/AdminNav.tsx:9      seven sections in one flex-wrap row
src/app/admin/AdminPackageCollectionPage.tsx:106   <AdminNav />
src/app/admin/enquiries/AdminEnquiriesPage.tsx:299 <AdminNav />
src/app/admin/tags/AdminTaxonomyPage.tsx:276       <AdminNav />
src/app/admin/content/AdminContentPage.tsx:215     <AdminNav />
src/app/admin/gallery/AdminGalleryPage.tsx:497     <AdminNav />
```

Three problems follow from that shape:

1. **The nav wraps to two lines below ~1100px** and gets worse with every section
   added. There is no room left in a single row.
2. **Every page re-declares the chrome.** Each one opens its own
   `<main className="min-h-screen bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">` and
   its own `max-w-*` wrapper — and they already disagree: `max-w-7xl` on
   packages/enquiries/tags, `max-w-5xl` on content/gallery. Page width is
   currently an accident, not a decision.
3. **The dashboard home is mostly dead space.** `AdminDashboard.tsx:86` renders a
   "Testimonials" tile whose value is the literal string `"-"`, and the metric
   tiles at `AdminDashboard.tsx:167` are unclickable — you read a number, then
   hunt for the page it refers to.

A persistent left sidebar fixes all three: navigation stops competing for
horizontal space, the chrome is declared once, and the dashboard home is freed up
to be a landing page instead of a second navigation menu.

**Styling is not changing.** Existing palette stays exactly as-is:

| Token | Use |
|---|---|
| `#06131D` | Ink / sidebar ground |
| `#0B1E28` | Raised surface on dark |
| `#D4AF37` / `#F3E5AB` | Gold accent, active state |
| `#997A15` | Gold text on light |
| `#F3EFEA` | Page ground |
| `#526168` | Secondary text |
| `font-display` / `font-body` | Unchanged |

The reference screenshot contributes **layout only**. Its green palette, charts,
and time-tracker widget are not adopted.

---

## Target shape

```
┌────────────┬──────────────────────────────────────────┐
│            │  Topbar: page title · admin email · out  │
│  Sidebar   ├──────────────────────────────────────────┤
│  #06131D   │                                          │
│            │  Content slot                            │
│  Overview  │  (whatever the route renders today,      │
│  Umrah     │   minus its <main> and max-w wrapper)    │
│  Hajj      │                                          │
│  Ramzan    │                                          │
│  Enquiries │                                          │
│  Gallery   │                                          │
│  Tags      │                                          │
│  Content   │                                          │
│            │                                          │
│  ───────   │                                          │
│  Signed in │                                          │
└────────────┴──────────────────────────────────────────┘
```

Sidebar fixed at `w-64`, full height, `bg-[#06131D]`. Active row gets the gold
treatment already used at `AdminNav.tsx:58` (`bg-[#06131D] text-[#F3E5AB]`),
inverted for the dark ground. Below `lg`, the sidebar becomes an off-canvas
drawer behind a hamburger.

---

## The one structural decision

`/admin` is currently **both** the login screen and the dashboard —
`AdminPageContent.tsx:65` branches on auth state and renders either
`AdminDashboard` or `AdminLoginForm` at the same URL. The login screen must not
get a sidebar.

Two ways to handle it:

- **(A) Shell as a component.** Each signed-in page imports `<AdminShell>` and
  wraps itself. Login stays untouched because it simply never imports it.
  No route changes, no redirect logic.
- **(B) Shell as a route-group layout.** Move the six sections into
  `src/app/admin/(shell)/` with its own `layout.tsx`; `/admin` stays outside the
  group. URLs are unaffected (route groups do not appear in the path). Cleaner,
  but the dashboard has to move to `/admin/dashboard` and `/admin` needs a
  post-login redirect.

**Plan: do (A) first, then (B) in Phase 5.** (A) is reversible per-page and lets
each section migrate independently; (B) is the correct end state but is only safe
once every page already renders identically inside the shell. Phase 5 is optional
— if (A) is working well, stopping there is a legitimate outcome.

---

## Phases

Each phase is independently shippable and leaves `main` deployable.

### Phase 1 — Build the shell, prove it on one page

**New:** `src/app/admin/AdminShell.tsx` (client component)

```tsx
<AdminShell title="Enquiries" description="Review customer requests">
  {children}
</AdminShell>
```

Renders sidebar + topbar + `<main>` content slot. Owns:
- the section list currently at `AdminNav.tsx:9`, plus an "Overview" row for `/admin`
- active-route highlighting via `usePathname()` (same logic as `AdminNav.tsx:50`)
- the sign-out button and admin email, moved out of the per-page headers
- one consistent content width — **`max-w-6xl`**, settling the 7xl/5xl split

**Migrate:** `enquiries/AdminEnquiriesPage.tsx` only. It is the densest page, so
if the shell works there it works everywhere. Remove its `<main>` (line 297),
its `max-w-7xl` div (298), and its `<AdminNav />` (299).

**Leave alone:** `AdminNav.tsx` still exists and still works for the other five
pages. Both navigation styles coexist for one phase — intentional, so a problem
found here costs one file to revert, not six.

**Done when:** Enquiries has a sidebar, every other page is untouched and
unbroken, no console warnings, `npm run build` clean.

---

### Phase 2 — Roll the shell across the remaining sections

Apply the Phase 1 edit to each of:

| File | Strip lines | Notes |
|---|---|---|
| `AdminPackageCollectionPage.tsx` | 104–106 | Serves Umrah, Hajj and Ramzan — one edit, three routes |
| `tags/AdminTaxonomyPage.tsx` | 274–276 | |
| `content/AdminContentPage.tsx` | 213–215 | Widens `max-w-5xl` → shell width |
| `gallery/AdminGalleryPage.tsx` | 495–497 | Widens `max-w-5xl` → shell width |

Each page's `<header>` block collapses too — title and description become
`<AdminShell>` props rather than per-page markup, and the primary action
(e.g. "Create new package", `AdminPackageCollectionPage.tsx:116`) becomes a
`headerAction` slot so it lands in the topbar.

**Then delete `AdminNav.tsx`.** Nothing imports it after this phase.

**Watch for:** the two `max-w-5xl` pages were narrow on purpose — they are
form-heavy. If the wider shell hurts them, add `contentWidth="narrow"` to the
shell rather than reintroducing a per-page wrapper.

**Done when:** all seven routes render inside the shell, `AdminNav.tsx` is gone,
`grep -r AdminNav src/` is empty.

---

### Phase 3 — Rebuild the dashboard home

This is where the screenshot's actual ideas land. `AdminDashboard.tsx` currently
does two jobs: it shows four metrics, then repeats the navigation as eight link
cards (lines 106–146). With a sidebar, the second job is redundant — delete it.

Replace with:

- **Stat cards that navigate.** Keep the existing counts (`AdminDashboard.tsx:30`
  already queries packages / enquiries / gallery) but make each card a `<Link>`
  to the page it describes, with an arrow affordance — the one genuinely good
  idea in the reference layout.
- **Kill the dead tile.** `label="Testimonials" value="-"` (line 86) goes. A tile
  that can never show a number is noise.
- **"Needs attention" panel** in its place: newest unhandled enquiries, pulled
  from the same `enquiries` table already queried at line 36 — swap
  `head: true` for an actual `select` limited to ~5 rows. This is the thing an
  admin opens the dashboard to find out.
- **Keep the System Status card** (line 149). It is small, honest, and already
  on-brand.

**Watch for:** the enquiries preview needs its own RLS-permitted read. If the
existing `head: true` count works, the row read will too — but verify against a
non-service-role session before shipping.

**Done when:** the dashboard answers "what needs me today?" rather than "where
can I click?".

---

### Phase 4 — Responsive and accessibility pass

Deferred deliberately: doing it before Phase 3 means doing it twice.

- Sidebar → off-canvas drawer below `lg`, hamburger in topbar, `Esc` to close,
  focus trapped while open, focus restored on close.
- `<nav aria-label="Admin sections">`, `aria-current="page"` on the active row
  (already correct at `AdminNav.tsx:55` — carry it over).
- Visible focus rings on sidebar rows against `#06131D` — gold `#D4AF37` at
  sufficient contrast.
- Verify at 360px, 768px, 1024px, 1440px.
- Confirm the shell does not trap scroll on the long pages (gallery, packages).

**Done when:** the admin area is usable one-handed on a phone, which is where
enquiries actually get triaged.

---

### Phase 5 — Hoist the shell into a layout *(optional)*

Only worth doing if Phases 1–4 left you wanting the shell declared once.

1. Create `src/app/admin/(shell)/layout.tsx` rendering `<AdminShell>`.
2. Move `packages/`, `hajj/`, `ramzan/`, `enquiries/`, `gallery/`, `tags/`,
   `content/` into the group. **URLs do not change.**
3. Move the dashboard to `(shell)/dashboard/`; `/admin` becomes login-only and
   redirects to `/admin/dashboard` on successful auth
   (`AdminPageContent.tsx:65` branch is replaced by a redirect).
4. Pages that currently pass `title`/`description` as props set them via the
   layout instead.

**Cost:** old `/admin` bookmarks now land on login-then-redirect rather than
straight on the dashboard. Acceptable, but it is a real behaviour change and the
reason this phase is last and optional.

---

## Explicitly out of scope

- **The duplicated auth guard.** Every section page repeats the same
  loading / not-signed-in branches (`AdminPackageCollectionPage.tsx:85–101`,
  and the same shape in four other files). It should be one `useAdminAuth()`
  hook or a layout gate — but that is an auth refactor, not a layout one, and
  mixing them makes both harder to review. Separate task.
- **Any public-site file.** Nothing outside `src/app/admin/**` is touched.
- **Charts, analytics, activity feeds.** No data exists behind them. Adding
  chart widgets to fill space is how the current dashboard got a `"-"` tile.
- **Palette or typography changes.** Layout only.

---

## Implementation notes

What the plan above did not anticipate, recorded after the fact.

### The public header was rendering on /admin

`src/app/layout.tsx:93` renders the marketing `<Header />` on every route, admin
included — which is why the admin pages carried `min-h-[calc(100vh-5rem)]`, that
`5rem` being the header's height. The header is also `sticky top-0 z-50`, so a
`fixed` sidebar would have sat underneath it.

`header.tsx` now returns `null` for paths starting `/admin`, placed after its
hooks so hook order holds. This is the one public-site file the migration
touched, and the plan's "no public-site files change" line was wrong about it.

Two consequences worth knowing:

- The admin area previously showed the full marketing chrome — "Curated
  Packages", "WhatsApp Chat", the phone number — above every dashboard page.
  That is gone.
- The four stale `min-h-[calc(100vh-5rem)]` declarations left a dead 5rem strip
  at the bottom of the viewport once the header stopped rendering. All switched
  to `min-h-screen` (`AdminDashboard.tsx`, `AdminPageContent.tsx` ×3, `page.tsx`).

### The sidebar prefetches all eight routes

Next prefetches every `<Link>` in the sidebar on each page load. In production
these routes are prebuilt so it is cheap. In dev it triggers a compile of all
eight admin routes at once — roughly 10s on a cold start. Not a bug, but it
looks like a hang the first time.

### Do not run `npm run build` against a live dev server

Doing so overwrites `.next/` and the running dev server starts serving `503` for
its own chunks (`main-app.js`, `layout.css`, `app-pages-internals.js`). The page
renders unstyled and never hydrates, which reads as an application bug and is
not one. Fix: stop dev, `rm -rf .next`, restart.

### Phase 3 verified against real data

The "needs attention" panel's row-level read of `enquiries` works under the
signed-in session's RLS, which the plan flagged as needing checking. Confirmed
with four live enquiries.

### Not verified: mobile

Phase 4's drawer (focus trap, Escape, scroll lock, focus restore) is implemented
and passes lint/types, but was **not** visually confirmed — the browser tooling
available here renders screenshots at a fixed size regardless of window resize,
so no narrow viewport could be exercised. Worth ten seconds on a real phone
before trusting it.

---

## Rollback

Phases 1–2 are per-file and each removes ~3 lines and adds a wrapper — reverting
one page is a single `git revert` of that file's hunk. `AdminNav.tsx` should be
deleted in its own commit at the end of Phase 2 so restoring it is trivial.
Phase 5 moves files and should be a single commit, reverted whole.
