# Mufti Travels — Improvement Notes

Working document. Findings are ranked worst-first within each section, with
`file:line` references so anything here can be checked or disputed.

Part 3 reviewed against commit `729e6fd`.
Parts 1 and 2 have been implemented — what remains of each is listed under it.

---

# Part 1 — Systems design review

## Done

Shipped in `1da1616`, with `supabase/migrations/008_admin_roles.sql` applied:

- **Admin role on every RLS policy.** `admin_users` + `is_admin()` now back
  packages, enquiries, tiers, tags and storage. Middleware checks admin status;
  a signed-in non-admin gets a clear refusal instead of a broken dashboard.
- **Public pages render server-side.** Home, catalog and detail read packages
  and the registries through a cached loader, so names and prices are in the
  server HTML and cards no longer swap in after hydration.
- **Caching enabled.** The global `cache: "no-store"` is gone; routes carry a 1h
  revalidate and admin saves clear the tag immediately.
- **Taxonomy N+1 fixed** — registries fetched once, not four times per page.
  `ManagedPackageCard` deleted, duplicate detail-route fetch removed.
- **Sitemap reads the CMS**, so admin-created packages are discoverable.
- **Unsaved-changes guard** in the package editor.
- **`next.config.ts`** derives the Supabase image host from env.

## 🔴 Still outstanding — disable public signup

A Supabase dashboard setting, not a code change:
Authentication → Providers → Email → turn off "Enable Sign Ups".

RLS now blocks a stranger who signs up from reaching anything, so this is
defence in depth rather than the last line. Still worth doing — there is no
reason for the public to be able to create accounts on this project at all.

Related: `admin_users` was seeded from every account that existed when the
migration ran. Check the list and remove anyone who should not be an admin:

```sql
select email, created_at from public.admin_users order by created_at;
delete from public.admin_users where email <> 'you@example.com';
```

## 🟡 Static price files still exist

`components/Prices/*.ts` and the mostly-commented `components/packageData.ts`
remain, and the three fixed-group city routes render from them directly.

The dangerous half is fixed — a failed CMS read no longer silently swaps in
stale static prices. What remains is duplication: the same package can be
described in two places and drift. Consolidating means moving those three city
pages onto the CMS and deleting the static files.

## 🟡 Session timeout is still a fixed timer

`AdminSessionTimeout.tsx:5` now explains itself when it fires, and the editor
warns before discarding work. But the timer still runs 15 minutes from
**sign-in** rather than from last activity, and remains client-side JS, so it is
a convenience rather than a security control. Real session length belongs in
Supabase JWT expiry settings.

## 🟡 No error tracking, no tests, no CI

A failed save for a real user still surfaces by phone call, if at all. Pushes go
straight to `main` → production with no gate. Both are decisions about tooling
and spend rather than code changes.

---

# Part 2 — UI/UX review

## Done

- **The hero search now carries its selections.** `Hero.tsx` pushes
  `/packages?city=&category=&season=` instead of discarding all three. The
  catalog filters on city and category, and shows a summary bar naming what was
  searched with a "Clear search" link. Season has no equivalent field in the
  package data, so it is echoed back and carried into the enquiry rather than
  silently ignored. A search matching nothing shows the full catalog with an
  explanation instead of an empty page.
- **The `/gallery` 404 is gone.** The button now points at the contact section,
  since the four images on the page are the whole gallery.
- **`/packages` has a footer**, and every section link in the header and footer
  is now `/#section`, so it navigates home from any page instead of doing
  nothing.
- **`EnquiryForm.tsx` deleted** — the fake form that thanked customers and
  saved nothing.
- **Contact form**: the notes field that was being submitted but never
  collected now exists on screen, the date input rejects past dates and no
  longer claims to accept a month, and a "Send another enquiry" link means the
  form is reusable without a reload.
- **`CustomDropdown` rebuilt as a real listbox** — visible focus ring, combobox
  and option roles, `aria-selected`, arrow keys with Home/End, focus returned to
  the trigger on Escape, and a properly associated label.
- **Gallery lightbox is keyboard accessible** — tiles are buttons, Escape
  closes, focus moves in on open and back to the tile on close, and the modal
  carries dialog semantics.
- **`error.tsx` uses `reset()`** with a working link back to the catalog.
- **Testimonials** respect `prefers-reduced-motion`, pause on focus as well as
  hover, and no longer depend on a third-party placeholder host.
- **Card flash and layout shift** resolved by the server rendering in Part 1.

Note: `/packages` is now a dynamic route because it reads search params. The
catalog data behind it is still cached, so this does not add database load.

## 🟡 Still outstanding

- **`loading.tsx`** is a centred spinner rather than a skeleton, so the layout
  still jumps when content arrives.
- **`ContactForm` never sets `package_name`.** Defensible — it is the general
  home-page form with no package context, and the detail-page dialog does set
  it. Worth revisiting only if you want to know which page an enquiry came
  from.
- **No focus-visible audit beyond the dropdown.** The remaining
  `focus:outline-none` uses in the codebase all pair with a ring, but that is
  worth re-checking whenever new controls are added.

## What the UX gets right

The package detail page is genuinely good: breadcrumbs, tabbed content, a sticky
price selector that disables unavailable sharing combinations rather than
letting you pick a dead end, and a proper accessible enquiry dialog. The
tier/sharing matrix is a hard interaction and it is handled well.

Trust signals are placed sensibly — MoFA authorisation, the proximity claim, and
pilgrim counts appear early and repeat without nagging. The WhatsApp path is
offered at every step, which matches how this audience actually communicates.

The admin editor's live slug preview and duplicate detection prevent a whole
class of mistake before it reaches the database.

---

# Part 3 — Admin panel review

Parts 1 and 2 touched the admin only in passing. This is a dedicated walk of the
operator's day: sign in → check what needs attention → answer an enquiry → edit
a package → sign out.

## 🔴 Enquiry status changes can fail silently

`enquiries/AdminEnquiriesPage.tsx:65`

```ts
async function updateStatus(id: string, status: Enquiry["status"]) {
  if (!supabase) return;
  await supabase.from("enquiries").update({ status }).eq("id", id);
  setEnquiries((current) =>
    current.map((item) => (item.id === id ? { ...item, status } : item)),
  );
}
```

The result is never checked. If the write fails — dropped connection, expired
session, RLS — the dropdown still flips to "Contacted" and stays there until the
page is reloaded.

This is the single field that records whether a paying customer was called back.
A staff member marks someone contacted, the write fails, the badge says
contacted, and **that customer is never called again**. Nobody finds out.

Needs the error checked, the optimistic update rolled back on failure, and a
visible message.

## 🔴 The enquiries screen does not survive success

Same file, line 44: `select("*")` with no filter, no pagination, no search — and
every enquiry renders as a fully expanded card.

At 30 enquiries this is a long scroll. At 300 it is unusable, and it fetches
every customer record on every visit. There is no way to answer the only
question that matters on opening the page: *which ones are new?*

The `status` column already exists and is already displayed. It just is not
filterable. Minimum viable fix: status filter tabs defaulting to "New", plus a
row limit.

Related: the dashboard metric says **"Enquiries: 47"** — a lifetime total. It
should count `status = 'new'`, because that is the number an operator acts on.

## 🟠 Being signed out mid-work loses the work, with no explanation

Three problems compound here:

1. `AdminSessionTimeout.tsx:5` is a fixed 15-minute timer started at **sign-in**,
   not on last activity. Editing a long package for sixteen minutes logs you out
   even though you never stopped typing.
2. The editor has **no unsaved-changes guard** — no `beforeunload`, no dirty
   check. Everything typed is gone.
3. It redirects to `/admin?timeout=1`, and **nothing reads that parameter.**
   Confirmed: the only occurrence in the codebase is the line that writes it.

So the operator is thrown to a login screen, mid-sentence, with their work gone
and no message explaining why. They will assume the site broke.

Fix in order: read the `timeout` param and show "Your session expired, please
sign in again"; add a dirty guard; make the timer idle-based; then move real
session control to Supabase JWT expiry.

## 🟠 Signing in never takes you where you were going

`middleware.ts:32` carefully records the intended destination:

```ts
loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
```

`AdminLoginForm.tsx:37` then ignores it:

```ts
router.push("/admin");
```

Deep-link to `/admin/enquiries`, get bounced to login, sign in — and land on the
dashboard. The parameter is written and never read. It is a finished feature
missing its last line.

## 🟠 Two package managers that behave differently

`packages/AdminPackagesPage.tsx` (233 lines) and `AdminPackageCollectionPage.tsx`
(239 lines) do substantially the same job. They have drifted:

| | `/admin/packages` | `/admin/hajj`, `/admin/ramzan` |
|---|---|---|
| Delete confirmation | `window.confirm("Delete X?")` | Styled modal naming the package and the URL that breaks |
| Success feedback | none | green banner |
| Layout | animated two-column | plain grid |

Same destructive action, two different levels of care. The browser `confirm()`
path does not warn that the package URL will 404 afterwards.

This duplication is partly mine — I added create/delete to
`AdminPackageCollectionPage` first and only later found `/admin/packages` was a
separate component. They should be one component with a `category?` prop.

## 🟠 The editor cannot reach several fields it saves

`ManagedPackageEditor.tsx` has no input for:

- **`rating` and `reviews`** — rendered as stars on every public card, editable
  only via SQL
- **`sort_order`** — the field that controls the order packages appear in on the
  website
- **`category`** — fixed at creation; a package filed wrongly must be deleted
  and recreated
- **`currency`** — defaults to INR with no way to change it

`sort_order` is the notable one: display order is a normal editorial decision,
and right now it requires database access.

## 🟡 Smaller admin friction

- **No sign-out except on the dashboard.** `AdminDashboard.tsx:59` has the only
  button. From Packages, Tags, Hajj, Ramzan or Enquiries you must navigate home
  first.
- **No navigation between admin sections.** Every page offers only "Back to
  dashboard". Packages → Tags is a two-hop journey. A persistent sidebar would
  fix this and the sign-out gap together.
- **`enquiries` shows a dead end when signed out** — plain text "Please sign in
  at /admin first" with no form and no link, while every other admin page
  renders the login form inline.
- **No WhatsApp link on enquiries.** Phone and email are linked; the channel the
  business actually runs on is not. A `wa.me` link per enquiry is one line.
- **No operator notes on an enquiry.** No way to record "called twice, no
  answer" — so that context lives in someone's head.
- **`preferred_date` renders raw ISO** (`2026-03-15`) while `created_at` is
  localised in the same card.
- **No image preview after upload.** `ManagedPackageEditor.tsx:331` shows the
  text "Image ready to save" — you cannot see what you uploaded until after
  saving and reloading the public page. No way to remove an image either.
- **Dashboard shows a "Preparing" badge** on Content Management, and
  Testimonials/Gallery metrics permanently reading "-" beside inert cards that
  look clickable.
- **No CSV export of enquiries.**

## What the admin gets right

Package editing itself is solid. Prices as tier × sharing rows with add/remove
beats a rigid matrix, `starting_price` is derived on save rather than typed, and
image upload goes to Supabase Storage properly rather than asking for a URL.

The tier dropdown and tag toggles now make invalid states unreachable, and the
create dialog's live slug preview with duplicate detection stops a bad URL
before it exists. Enquiry cards surface phone and email as working `tel:` and
`mailto:` links, which is the right instinct.

## Suggested order

1. **Check the error on enquiry status updates** — silent failure loses
   customers (minutes)
2. **Filter enquiries by status, default to New** — the screen stops working as
   you grow (half a day)
3. **Read the `timeout` param and add a dirty guard** — stop losing work
   silently (an hour)
4. **Read the `redirect` param on login** — one line
5. **Merge the two package managers** onto the safer delete flow (half a day)
6. Expose `sort_order`, then a shared admin nav with sign-out
7. WhatsApp links, image preview, operator notes

Items 1 and 2 are the ones that cost money.
