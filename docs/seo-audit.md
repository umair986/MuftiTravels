# SEO: where the site stands, and what to do next

**Written:** 22 August 2026
**Target queries:** "umrah operator in mumbai", "umrah packages from mumbai", "hajj packages india", "umrah tour operator near me"

---

## Progress (updated 17 September 2026)

| Step | State |
|---|---|
| 1. Google Business Profile + reviews | Not code — owner's action |
| 2. Category pages | **Done** — `packages/[category]/page.tsx`, in sitemap |
| 3. Default OG image | **Done** — `public/og-image.jpg`, 1200×630 |
| 4. LocalBusiness + Product + Breadcrumb schema | **Done** — `src/lib/seo.ts`; opening hours added 17 Sep. `geo` left out until copied from the verified GBP |
| 5. Mumbai city page | **Done** — `/umrah-packages-from-mumbai`, FAQ schema, office block, in sitemap and footer |
| 6. Delhi + Lucknow city pages | **Done** — `/umrah-packages-from-delhi`, `/umrah-packages-from-lucknow`; same template, no office block (the office is in Mumbai) |
| 7. `/about`, `/contact` | Open |
| 8. Guides / blog | **Started** — `/guides` index + first article, *Umrah from India: Passport, Visa and Immigration Documents* (sources checked 17 Sep 2026). Articles are typed data in `src/content/guides/`, listed in `src/lib/guides.ts` |
| Sitemap `lastModified` from `updated_at` (§2.6) | **Done** for packages and gallery |
| Homepage title mentions Mumbai (§2.6) | Open |

**17 Sep — hardcoded packages removed.** Every package on the public site now
comes from the admin. The old static pages
`/packages/umrah-fixed-group/{mumbai,delhi,lucknow}` are gone and 308-redirect
(in `next.config.ts`) to their admin equivalents
`/packages/umrah-fixed-group/15-days-regular-umrah-from-{city}`, so links
already shared keep working and their ranking carries over. The sitemap no
longer lists the old URLs.

The sections below are the original audit, kept as written.

---

## The short version

The technical foundation is good — better than most travel-agency sites. What's
missing is **pages to rank**. You have effectively three indexable content pages
(`/`, `/packages`, and three city package pages) competing for queries that want
a page about *that specific thing*.

For "umrah operator in **mumbai**" specifically, the biggest lever is not on the
website at all — it's the Google Business Profile. See §4.

---

## 1. What is already right

Worth knowing so it doesn't get "fixed" later:

| | Status |
|---|---|
| Server-rendered content | Package names, prices and copy are in the server HTML. Google sees them without running JavaScript. |
| `sitemap.xml` | Generated from the live catalog — a package added in the admin appears automatically. |
| `robots.txt` | Allows the site, blocks `/admin`. Correct. |
| Canonical URLs | Set on `/`, `/packages`, and every package detail page. |
| Title template | `%s | Mufti Travels` with per-package titles. |
| Headings | Exactly one `<h1>` per page, and it describes the page. |
| Real address on the site | A/57 Madni Complex, Bandra East, Mumbai — 400051, in the footer. |
| Image `alt` text | Descriptive, not stuffed. |

---

## 2. The gaps, in priority order

### 2.1 Category pages 404 — highest impact, smallest fix

`/packages/hajj`, `/packages/ziyarat`, `/packages/umrah-land-package` and
`/packages/ramzan` **all return 404 today**. The route tree has
`packages/[category]/[slug]/page.tsx` but no `packages/[category]/page.tsx`, so
the category level has no page.

That means "hajj packages india" has nothing on your site to rank except the
homepage and the mixed `/packages` catalog. Five landing pages are missing at
the exact level of specificity these queries want.

**Fix:** add `packages/[category]/page.tsx` listing that category's packages,
with `h1` = "Hajj Packages from India", a paragraph of real copy, and canonical
`/packages/hajj`. Also add them to `sitemap.ts`.

### 2.2 No city landing pages

The closest thing to a Mumbai page is `/packages/umrah-fixed-group/mumbai`,
titled *"15 Days Regular Umrah from Mumbai"* — that is **one package**, not a
page about Umrah from Mumbai.

Someone searching "umrah packages from mumbai" wants departure dates, prices
from Mumbai, the local office, and an answer to "who are you". A single package
page half-answers that.

**Fix:** a page per departure city — Mumbai, Delhi, Lucknow — at a URL that
reads like the query (`/umrah-packages-from-mumbai`), containing:

- `h1`: "Umrah Packages from Mumbai"
- Every package with a Mumbai departure, with prices
- The Mumbai office address, phone, and map
- 5–8 FAQs (cost, visa, duration, best time, what's included)
- Internal links to the individual packages

Mumbai first — it's where the office is, so it's the query you can actually win.

### 2.3 Structured data is thin

There is a `TravelAgency` JSON-LD block on the homepage, but it carries only
name, url, logo, description, areaServed and serviceType. For local search the
fields that matter are the ones missing:

- `address` (PostalAddress — Bandra East, 400051) ← **the local-SEO one**
- `telephone`, `openingHours`, `geo`, `priceRange`, `image`
- `sameAs` → Instagram, Facebook, Google Business Profile

Also worth adding:

- **`Product` / `Offer`** on each package page, with price and currency. This is
  what produces the price shown under a result — a real click-through gain on
  commercial queries.
- **`BreadcrumbList`** on package pages, so results show
  `muftitravels.com › Packages › Umrah Fixed Group` instead of a raw URL.
- **`FAQPage`** on the city pages.

Minor: the JSON-LD hardcodes `https://muftitravels.com` while the rest of the
app reads `NEXT_PUBLIC_SITE_URL`. Use the same source.

### 2.4 No default social preview image

`openGraph` in `src/app/layout.tsx` sets a title and description but **no
image**. Every share of the homepage or `/packages` on WhatsApp, Facebook or
Instagram renders as a bare text link. Given that WhatsApp is your primary
channel, this is a cheap, high-visibility fix: add a 1200×630 image and set
`openGraph.images` in the root metadata.

### 2.5 No informational content

There is no blog or guide section. Queries like "umrah cost from mumbai 2026",
"umrah visa requirements for indian passport", "best time for umrah" are how
pilgrimage operators build the authority that later lets them rank for the
commercial terms. You currently rank for none of them because you have no page
about them.

This is the slowest lever and the one that compounds. Six articles, answered
properly, beats sixty thin ones.

### 2.6 Smaller items

- **Homepage title** says "from India" and never "Mumbai". Consider
  "Hajj & Umrah Packages from Mumbai, Delhi & Lucknow" (stay under ~60 chars).
- **No `/about` or `/contact` route** — both are homepage anchors, so neither
  can rank on its own. A real About page with the licence number and team also
  feeds Google's trust signals for money-and-life topics, which pilgrimage
  bookings are.
- **`sitemap.ts` sets `lastModified: new Date()`** on every entry at build time,
  so everything always claims to have changed today. Use each package's
  `updated_at` instead — Google discounts a sitemap that cries wolf.
- **`keywords` metadata** is ignored by Google. Harmless, but not doing anything.
- The header no longer links to Contact (changed 22 Aug). Fine for UX; if a
  `/contact` page is added later, link it from the footer at minimum.

---

## 3. Core Web Vitals

Not measured yet — worth a real check rather than a guess. Run PageSpeed
Insights on `/` and one package page. The likely candidate for trouble is the
hero image (LCP), since the homepage carries a large background photograph and
several icon libraries. `next/image` with `priority` is already used on the
hero, which is the right start.

---

## 4. The part that isn't code

For **"umrah operator in mumbai"**, the top of the results page is the map pack
— three local businesses with ratings. Organic rank 1 sits below it. No amount
of on-site work puts you in that block; the Google Business Profile does.

1. **Claim and verify the Google Business Profile** for A/57 Madni Complex,
   Bandra East. Category: "Travel agency". Add the same phone number the site
   uses, hours, and 15–20 real photos.
2. **Reviews are the ranking factor** in that block. Ask returning pilgrims —
   the WhatsApp thread you already have with each of them is the natural place.
3. **Keep the name, address and phone identical** everywhere — site footer,
   GBP, Justdial, Facebook. Inconsistent NAP is the classic local-SEO leak.
4. **Directory listings** that Indian travel searches surface: Justdial,
   IndiaMART, Sulekha, and Hajj/Umrah operator directories.

If you do only one thing from this document, do this section. It outranks
everything in §2 for "in mumbai" queries.

---

## 5. Suggested order

| Step | Effort | Why first |
|---|---|---|
| 1. Google Business Profile + reviews | Not code | Owns the map pack; nothing else competes for "in mumbai" |
| 2. Category pages (`/packages/hajj` etc.) | Small | They 404 today; five pages from one route file |
| 3. Default OG image | Tiny | Every WhatsApp share currently looks broken |
| 4. Full LocalBusiness + Product schema | Small | Address in schema is the local signal; price in results lifts clicks |
| 5. Mumbai city landing page | Medium | The page that actually targets the query |
| 6. Delhi + Lucknow city pages | Medium | Same template, once it's proven |
| 7. `/about`, `/contact` routes | Small | Trust signals, two more indexable pages |
| 8. Guides / blog | Ongoing | Compounds; nothing else builds topical authority |

---

## 6. What this document does not claim

No traffic numbers, no rank estimates, and no timeline. Nothing here has been
measured against live Search Console data — the findings are from reading the
codebase. Before spending on any of it, connect **Google Search Console** and
look at what the site already gets impressions for. That will re-order this
list with evidence instead of inference.
