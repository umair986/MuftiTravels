# Monthly packages, by departure city

Migration `026_monthly_city_packages.sql`. Decided with the business on 2026-10-07.

## The problem

Umrah prices move every 15–30 days, and the airline and hotels change with them
often enough that one month's offer is a different product from the last. Before
this, a package was one permanent row whose price grid someone had to remember
to edit. A stale price on the site is one a customer holds the business to.

The business also wants the site to show a believable *current* price and leave
the detail — exact dates, Ramadan and winter rates — to a phone call or WhatsApp
message. The site's job is to get that conversation started, not to replace it.

## The shape

- An Umrah package is made **for a month** and **from a city**:
  "15 Days Umrah from Mumbai — November 2026".
- It is on the site from the moment it is published until the end of its month,
  India time, and then it is hidden automatically.
- Hidden packages are **not deleted automatically**. The dashboard flags them and
  the admin deletes them by hand.
- Each city has a page with a permanent address, `/umrah-packages-from-<city>`,
  listing that city's current packages newest month first. The home page links
  to the cities, not to the packages.
- Hajj and Ramadan packages have no month and never expire.

Cities: Mumbai (the home city, featured), Delhi, Lucknow, Hyderabad, Bangalore,
Ahmedabad. All six sell the same tiers; prices, airline and hotels differ.

## Decisions

### 1. A new package per month, not a price history on one package

The first proposal was one permanent package with monthly *prices* attached
(copy last month's grid, edit, publish). Rejected by the business because more
than the price changes month to month — the airline, sometimes the hotels — and
a monthly package says that honestly. The cost the first proposal was protecting
against (links breaking, Google starting from zero every month) is handled by
Decision 4 instead. "Duplicate for next month" in the admin keeps the monthly
work to editing what changed.

### 2. Expiry is a select policy, not a job

`Published packages are public` (rewritten in 026) admits a row only while
`valid_month >= public.current_ist_month()`. Nothing has to run at midnight, so
nothing can fail to run at midnight.

**Rejected: a pg_cron job that deletes or unpublishes.** A job that has not run
leaves expired prices public; a policy cannot be late. And unpublishing would
destroy the information "this was published", which the redirect in Decision 5
needs.

**The hour after midnight.** The home and city pages are statically rendered and
revalidated hourly, so a page rendered at 23:30 on 31 October can show October's
packages until about 00:30. `getPublicCatalog()` filters expired months *after*
the data cache so any page rendered after midnight is correct, but an already
rendered page waits for its revalidation. Judged acceptable; making it exact
means a scheduled revalidation at 00:00 IST, which is a cron dependency for one
hour a month.

### 3. Midnight means midnight in India

Supabase and Vercel run on UTC, where 1 November begins at 05:30 IST.
`public.current_ist_month()` in SQL and `currentIstMonth()` in
`src/lib/departures.ts` both compute the month in `Asia/Kolkata`. They are a
pair, like `quotation_overview` and `isExpired()` in the quotations module, and
`departures.test.ts` pins the boundary from both sides.

### 4. Delete by hand, flagged on the dashboard

The business asked for this explicitly. A package removed by a job is a package
nobody looked at first, and nothing needs it gone for the site to be correct —
Decision 2 already hides it. The dashboard shows "N packages are past their
month" linking to `/admin/packages?status=expired`, and the package list carries
a red Expired badge and an Expired filter.

### 5. An old link lands on its city

A WhatsApp forward of October's package, opened in November, would otherwise be
a 404. The detail route asks `package_city_for_slug()` on a miss and redirects to
the city page. That function answers for a package that was published and has
expired, or one that was deleted — the `after delete` trigger copies slug → city
into `package_redirects` — and **not** for a draft, whose existence is not
public. It returns a city key and nothing else.

A 307, not a 308: browsers cache a permanent redirect indefinitely, and a
package whose month the admin extends must be reachable again.

### 6. The city page is the permanent address

The URL that gets shared, advertised and ranked is `/umrah-packages-from-mumbai`,
which already existed for Mumbai, Delhi and Lucknow and had started building
search history. The monthly packages beneath it come and go. The city pages used
to find their one package by a fixed slug (`15-days-regular-umrah-from-<city>`);
they now list every current package with that `departure_city`.

Monthly package pages keep their own canonical URL. Pointing them at the city
page was considered and rejected: a canonical to a page with different content
is a hint Google is free to ignore, and while live they are legitimate pages.

### 7. City is a key, checked for shape, not membership

`departure_city` stores `mumbai`, never "Mumbai", for the reason tiers and tags
do (migration 006). The CHECK enforces only the shape (`^[a-z]{0,40}$`): a city
needs a page — copy, airport, a route file — before it is of any use, and that
is code. Listing the six in a CHECK would make a seventh a migration as well as
a deploy, for no protection the admin's dropdown does not already give.

### 8. "From" is the floor across current months

A city's "from ₹X" — on its home-page card, in its page header, in the FAQ and
the search snippet — is the lowest price across every Umrah package for that
city still on sale, not the newest month's alone. If October is cheaper and both
are on sale, October's price is the true floor. One function,
`cityFromPrice()` in `src/lib/cityPackages.ts`, so all four places agree.

### 9. A city with nothing current still shows its card

All six cities appear on the home page. One with no current package says
"Enquire for this month's price" and its page offers WhatsApp. Hiding the card
was the first proposal; rejected because the business sells from all six, and an
enquiry is still a lead.

### 10. Nothing breaks between the deploy and the migration

The migration is applied by hand, so there is a window where the new code reads
rows without `departure_city` or `valid_month`. In that window:

- the city pages fall back to the slug rule the migration's backfill uses, so
  they show what they showed before;
- the admin editor and create dialog only write the new columns once they exist;
- the quotation picker selects `*` and filters in code, rather than naming a
  column that would fail its whole read;
- the dashboard's expired count errors quietly and shows nothing.

## Applying it

1. Run `026_monthly_city_packages.sql` in the Supabase SQL editor.
2. It files existing packages under their city by slug. It does **not** set
   months — nothing in a slug says which month a package was priced for, and a
   guess would hide packages the moment it ran. Set the month on each existing
   Umrah package in the admin; anything set to September 2026 or earlier
   disappears from the site immediately and appears in the Expired list.

## Open

- Hyderabad, Bangalore and Ahmedabad do not claim a direct flight
  (`direct: false` in `src/lib/cityLanding.ts`) until the business confirms one.
- The expired alert links to the Umrah list. A Hajj or Ramadan package given a
  month by mistake would expire and be hidden, but would only be flagged on its
  own list.
