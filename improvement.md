# Mufti Travels — Improvement Notes

Working document. Findings are ranked worst-first within each section, with
`file:line` references so anything here can be checked or disputed.

Reviewed against commit `729e6fd` on 2026-08-22.

---

# Part 1 — Systems design review

## 🔴 Critical: RLS grants every logged-in user full admin

Every policy in the schema is role-blind:

```sql
-- 001_create_packages.sql:47
create policy "Authenticated users manage packages"
on public.packages for all to authenticated
using (true) with check (true);
```

Same shape in `004_create_enquiries.sql:26`, `002_package_image_storage.sql`, and
the two added in `006_tier_and_tag_registry.sql`. There is no admin check
anywhere — `authenticated` just means "holds any valid JWT".

The anon key is public by design; it ships in the client bundle. So the question
that decides whether this is a live vulnerability is: **is email signup enabled
in Supabase Auth settings?** It is ON by default. If it is, anyone can call
`signUp()` against the project and immediately get:

- write and delete on every package, including prices
- **read on every row of `enquiries`** — customer names, emails, phone numbers,
  travel dates
- upload and delete on the image bucket

That third one is a customer data breach, not just a defacement risk.

**Immediate mitigation:** Supabase Dashboard → Authentication → Providers →
Email → disable "Enable Sign Ups".

**Real fix:** a role claim — an `admin_users` table or a JWT claim — with
policies reading `using (public.is_admin())` instead of `using (true)`.
`middleware.ts:31` has the same gap: it checks that `getUser()` returns
*someone*, never *who*.

Treat this as the only item that matters until it is closed.

## 🟠 Public content is fetched client-side, so search engines cannot see it

`ManagedPackagesCatalog.tsx:29` and `ManagedPackageCard.tsx:30` fetch packages in
`useEffect`. The server HTML contains only the fallback — package names, prices
and descriptions arrive after hydration.

1. **SEO.** For a business whose funnel is "Umrah package Mumbai price"
   searches, CMS-managed package content is absent from the server HTML.
2. **Performance.** Fallback paints, then swaps — layout shift and a slow LCP on
   mobile, which is most of the traffic.
3. **Cost and blast radius.** Every visitor's browser hits Supabase directly,
   with no CDN in front. A traffic spike goes straight at the database.

The detail page (`packages/[category]/[slug]/page.tsx:32`) already does this
correctly as a server component. The home and catalog pages were never migrated.

## 🟠 Caching is globally disabled on purpose

```ts
// src/lib/supabase/server.ts:13
fetch: (input, init) => fetch(input, { ...init, cache: "no-store" })
```

On the browser client this is fine. On the **server** client it defeats Next's
data cache entirely — every request to every package page is a fresh round trip
to Supabase. There is no ISR, no `revalidate`, no tag-based invalidation.

Package prices change perhaps weekly. `revalidate: 3600` plus
`revalidateTag('packages')` fired on admin save would cut database reads by
orders of magnitude. Highest performance-per-effort change available.

## 🟠 Three sources of truth for prices

Prices live in `components/Prices/*.ts` (static), `components/packageData.ts`
(mostly commented out), and Supabase. The card components fall back silently
from CMS to static.

If Supabase is misconfigured or down, the site quietly serves stale hardcoded
prices instead of erroring. For a travel business, silently displaying a wrong
price is worse than displaying nothing — you may be held to it.

The fallback was a sensible migration net. Now that the CMS works, it is a
liability. Pick one source and delete the other.

## 🟡 Introduced during the tier/tag work — needs fixing

**N+1 on the taxonomy registries.** `useTaxonomy()` fires per component
instance: `ManagedPackageCard.tsx:22`, `ManagedPackagesCatalog.tsx:22`, and
twice in `PackageDetailExperience.tsx` (lines 300 and 400). The home page makes
**4 redundant queries** for data that never changes between them. Needs to be a
React context, or fetched server-side and passed down.

**`sitemap.ts:6` only reads static `packageData`.** Any package created through
the admin — every Hajj and Ramzan package about to be added — will never appear
in the sitemap. Predates this work, but directly undercuts it.

## 🟡 Operational gaps

- **`AdminSessionTimeout.tsx:5`** is a 15-minute timer from *sign-in*, not from
  last activity, and is client-side JS — trivially bypassed, so not a real
  security control. Worse, it can fire mid-edit and **lose unsaved work**,
  because the editor has no dirty-state guard. Real session control belongs in
  Supabase JWT expiry settings.
- **No error tracking.** A failed save for a real user surfaces by phone call,
  if at all.
- **No tests, no CI.** Pushes go straight to `main` → production, with no gate.
- **`next.config.ts:8`** hardcodes the Supabase project hostname. Should be an
  env var.

## What is genuinely well built

The middleware auth redirect is correct. The detail page's server-component data
flow is the right pattern. `generateMetadata` per package is properly done. The
image pipeline through Supabase Storage with `next/image` is sound. Enquiries
having insert-for-anon but manage-for-auth is the right *shape* of policy — it
just needs the role check.

## Suggested order

1. **Turn off public signup** — 5 minutes, closes the breach
2. **Add a real admin role to RLS + middleware** — half a day
3. **Delete the static price fallback** — an hour, removes wrong-price risk
4. **Move home/catalog to server components + `revalidate`** — half a day
5. Fix the taxonomy N+1 and the sitemap
6. Unsaved-changes guard, then error tracking

Items 1 and 2 are security. Everything below is quality.

---

# Part 2 — UI/UX review

Walked as a visitor would: land → find a package → open it → enquire. Then the
admin flow. Ranked by business impact, not by how hard they are to fix.

## 🔴 The hero search ignores everything the visitor selects

`Hero.tsx:99`

```ts
const handleQuickSearch = (e: React.FormEvent) => {
  e.preventDefault();
  router.push("/packages");
};
```

The most prominent control on the site asks for departure city, package
category and travel season across three well-built dropdowns — then throws all
three away and pushes to an unfiltered list.

Someone selects *Lucknow · Land Package · Ramadan*, presses **View Packages**,
and lands on a page showing Mumbai fixed-group departures. Nothing they chose is
reflected, and nothing explains why. This is the first interaction most visitors
have, and it silently fails.

Either pass the selections through as query params and filter the catalog, or
remove the dropdowns and make it a plain link. The current state is worse than
either, because it teaches visitors the site does not listen.

## 🔴 "View Full Pilgrim Gallery" is a 404

`GallerySection.tsx:110` links to `/gallery`. That route does not exist —
confirmed against the build output and the route tree. The button sits at the
end of the gallery section on the home page, styled as a primary gold CTA.

Either build the page or drop the button.

## 🔴 The packages page has no footer and five dead nav links

`/packages` renders only the catalog. No `<Footer />`, no `<ContactSection />`.

`header.tsx:27` defines seven nav links, five of which are in-page anchors:
`#why-us`, `#journey`, `#about`, `#gallery`, `#contact`. `handleSmoothScroll`
calls `getElementById` and, when the element is missing, **does nothing at all** —
no navigation, no feedback. Those sections only exist on the home page.

So on `/packages`, and on every package detail page, five of seven nav items are
inert. A visitor clicking "Contact" gets silence. The footer's link list
(`Footer.tsx:116`) has the identical problem.

This also means the packages page — the page closest to a booking decision — has
no phone number, no address, and no way to reach you without going back home
first. Anchors should be `/#contact`, not `#contact`, so they work from
anywhere.

## 🟠 A fake enquiry form is sitting in the codebase

`packages/EnquiryForm.tsx:27`

```ts
// This is where you would call your API route
// For now, we simulate a delay
await new Promise((resolve) => setTimeout(resolve, 1500));
setSubmitMessage("Thank you for your enquiry! Our team will get in touch...");
```

It waits 1.5 seconds, tells the customer their enquiry was received, and stores
nothing.

**It is currently dead code** — nothing imports it, and the real dialog
(`PackageDetailExperience.tsx:45`) does insert to Supabase correctly. So no
leads are being lost today. But it is a loaded gun: 105 lines that look
production-ready and will silently discard customer enquiries the moment someone
wires them up. Delete it.

## 🟠 The contact form asks for less than it claims

`ContactForm.tsx`

- **The `notes` field is submitted but never collected.** It is in state
  (line 46) and sent to Supabase (line 103), but there is no textarea anywhere
  in the form. Every enquiry saves an empty `notes`. The field that would carry
  "my mother uses a wheelchair" does not exist on screen.
- **The label says "Preferred Travel Date / Month" but the control is
  `type="date"`.** A visitor who wants to say "sometime in Ramadan" is forced to
  invent an exact day. Either relabel it or offer a month picker.
- **No `min` on the date input** — a past date can be submitted.
- **`package_name` is never populated**, though the table has the column. An
  enquiry from a specific package page does not record which package.
- **Success replaces the whole form.** There is no way to send a second enquiry
  without reloading the page.

## 🟠 Package cards flash and shift on load

`ManagedPackageCard.tsx:42` and `ManagedPackagesCatalog.tsx:41` render a
fallback card until the client fetch resolves, then swap in real content.

On a slow connection a visitor sees one package, then it changes to a different
one, with different pricing. That reads as a glitch at best and a bait-and-switch
at worst. Fixing the server-side rendering issue in Part 1 removes this entirely.

## 🟠 Accessibility gaps that block keyboard and screen-reader users

**`CustomDropdown.tsx`** — used in the hero and the contact form, so it is on the
critical path:

- `focus:outline-none` on the trigger (line 78) with **no replacement ring**.
  Keyboard users cannot see where they are. WCAG 2.4.7 failure.
- No `role="listbox"` / `role="option"` / `aria-selected`, no
  `aria-haspopup="listbox"`.
- No arrow-key navigation, no Home/End, no type-ahead.
- Focus is not returned to the trigger when Escape closes the menu.
- The label is a `<div>` (line 71), not associated with the control, so screen
  readers announce an unlabelled button.

**Gallery lightbox** (`GallerySection.tsx:66`) — tiles are `<div onClick>`, not
buttons: unreachable by keyboard, invisible to screen readers. The modal has no
Escape handler, no focus trap, and no `role="dialog"` / `aria-modal`.

By contrast `EnquiryDialog` (`PackageDetailExperience.tsx:62`) does this
correctly — `role="dialog"`, `aria-modal`, `aria-labelledby`, labelled close
button. That is the pattern to copy.

Across `src/app`, 12 uses of `focus:outline-none`, 3 of which add no replacement
ring.

## 🟡 Smaller things worth doing

- **`error.tsx` never uses `reset()`.** Next passes a retry function; the page
  instead tells the user to refresh manually and says "return to the available
  packages" without linking there. Two lines to fix.
- **Testimonials marquee** (`Testimonials.tsx:142`) runs a 45s infinite
  animation with no `prefers-reduced-motion` guard, and pauses on hover but not
  on focus — a keyboard user tabbing through cannot stop it.
- **`Testimonials.tsx:92`** falls back to `placehold.co` on image error. That
  host is not in `next.config.ts` `remotePatterns`, and it puts a third-party
  request on your page for a case a local placeholder would cover.
- **Admin dashboard** (`AdminDashboard.tsx:109`) shows "Testimonials" and
  "Gallery" cards styled like the working ones but with no `href`. They look
  clickable and do nothing. Mark them "Coming soon" or remove them.
- **`loading.tsx`** uses a centred spinner rather than a skeleton, so the layout
  jumps when content arrives.

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

## Suggested order

1. **Fix the hero search** — it is the first thing visitors touch (half a day)
2. **Fix or remove the `/gallery` link** — a broken CTA on the home page (minutes)
3. **Add the footer to `/packages` and make nav anchors `/#section`** (an hour)
4. **Delete `EnquiryForm.tsx`** before it gets wired up (minutes)
5. **Add the notes field, fix the date label and `min`** (an hour)
6. **CustomDropdown focus ring and listbox semantics** (half a day)
7. Gallery lightbox keyboard access, `error.tsx` reset, reduced-motion guard

Items 1–4 are visitor-facing failures. Items 5–7 are quality and access.

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
