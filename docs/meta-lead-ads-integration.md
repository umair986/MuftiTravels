# Meta Lead Ads → Website Integration

**Status:** Not implemented. This is a decision document.
**Written:** 22 August 2026

---

## The problem

Leads arrive in two places that do not talk to each other.

| | Where the form lives | Where the lead lands | What you can do with it |
|---|---|---|---|
| **Meta ads** | Facebook / Instagram, hosted by Meta | Spreadsheet | Read it. Nothing else. |
| **Website** | `muftitravels.com` contact form | `public.enquiries` in Supabase | Status tracking, follow-up notes, WhatsApp reply, search, CSV export |

Two inboxes means two habits, two places to lose a lead, and no single answer to "who have we not called back yet?"

The goal is one inbox: `/admin/enquiries`.

---

## What is NOT the problem

Worth saying plainly, because it changes how urgent this is:

- **You are not losing leads today.** The spreadsheet works. This is about consolidation and follow-up discipline, not rescue.
- **Website form capture already works and costs nothing.** Nothing here changes that.
- **Meta's native lead form is probably converting better than your website form would.** It pre-fills the user's name, email and phone from their Facebook profile and never leaves the app. Do not "solve" this by pointing ads at your website instead — that would almost certainly raise your cost per lead, not lower it.

---

## The four options

### Option A — Meta webhook direct to the website

Meta calls a URL on your site the moment someone submits. Your site fetches the lead detail from the Graph API and writes it into `enquiries`.

**Pros**
- **Zero marginal cost per lead, forever.** Runs on Vercel and Supabase, both already paid for.
- Real time — a lead is in the admin panel within seconds.
- No third party in the chain that can break, change pricing, or see customer data.
- Meta retries failed deliveries, so a brief outage does not lose leads.

**Cons**
- **Requires Meta App Review**, which is the real cost here. See "The App Review problem" below.
- Needs a Meta App, business verification, and a long-lived Page access token that must be rotated if it is ever revoked.
- If your endpoint is down for over ~36 hours, Meta stops retrying and those leads exist only in Meta's UI.

**Cost:** ₹0/month.
**Time to working:** 1–4 weeks (almost all of it waiting on Meta).

---

### Option B — Zapier or Make as a bridge

A third party watches your Meta lead forms and forwards each lead to your site.

**Pros**
- **Skips App Review entirely.** Zapier and Make are already approved by Meta; you inherit their permission.
- Working in an afternoon.
- Useful for other things later (e.g. also posting a lead to WhatsApp or Slack).

**Cons**
- **Ongoing subscription.** See the cost section — this is your actual question.
- A third party holds a token to your ad account and sees every customer's name and phone number. Review their data policy.
- Another vendor to monitor. When a Zap silently breaks, leads stop and nothing tells you.
- Slight delay — free and cheap tiers poll on a schedule (often 5–15 minutes) rather than pushing instantly.

**Cost:** roughly ₹900–2,500/month depending on provider and volume. **Verify current pricing before deciding — this changes often.**
**Time to working:** same day.

---

### Option C — Sync the existing spreadsheet

Keep Meta writing to Google Sheets. A Google Apps Script trigger posts each new row to your site.

**Pros**
- Free.
- No Meta App, no App Review, no new vendor.
- You keep the spreadsheet you already trust.

**Cons**
- **Most fragile of the four.** Depends on the sheet's structure never changing; someone reordering a column breaks it silently.
- Apps Script triggers are not instant and Google throttles them.
- Two hops means two places to debug when a lead goes missing.
- Still requires the same endpoint work on the website side as A and B.

**Cost:** ₹0/month.
**Time to working:** 1–2 days.

---

### Option D — Do nothing, import manually

Export the CSV from Meta weekly and paste it into an import screen on the admin panel.

**Pros**
- Free. No integration, no vendor, no App Review, no tokens.
- Genuinely reasonable at low volume.

**Cons**
- Someone has to remember to do it.
- Leads sit uncontacted between imports. For a business where speed of callback drives conversion, a weekly batch is slow.

**Cost:** ₹0/month + about 10 minutes a week of someone's time.
**Time to working:** half a day (I would build a CSV import screen).

---

## Cost analysis

This is the part your question was actually about.

### The honest framing

The subscription in Option B is **not a permanent per-lead tax** — unless you choose to make it one. If you follow the "bridge" plan (B now, A when approved), you pay it only during the App Review wait, then cancel.

```
Option B as a permanent solution:  ₹900–2,500  every month, forever
Option B as a bridge to Option A:  ₹900–2,500  ×  3–4 weeks  ≈  one month's fee, once
```

### Per-lead impact

Assume Meta lead ads for Umrah/Hajj in India cost somewhere in the ₹150–400 per lead range (**use your own numbers — you have them, I do not**).

| Monthly leads | Bridge cost/month | Added cost per lead | As % of a ₹250 lead |
|---|---|---|---|
| 50 | ₹2,000 | ₹40.00 | +16% |
| 150 | ₹2,000 | ₹13.30 | +5.3% |
| 300 | ₹2,000 | ₹6.70 | +2.7% |
| 600 | ₹2,500 | ₹4.20 | +1.7% |

**Read this table as:** at low volume the bridge is genuinely expensive per lead; at higher volume it disappears into the noise. And in the bridge plan you pay it for one month, not forever.

**Option A after approval: ₹0 added per lead at any volume.**

### The real cost comparison

| | Setup effort | Ongoing ₹ | Time to first lead | Long-term |
|---|---|---|---|---|
| A — Meta direct | Medium | **₹0** | 1–4 weeks | **Best** |
| B — Zapier/Make | Low | ₹900–2,500/mo | Same day | Expensive forever |
| A via B bridge | Medium | ~1 month's fee once | Same day | **Best** |
| C — Sheet sync | Low-Medium | ₹0 | 1–2 days | Fragile |
| D — Manual CSV | Low | ₹0 | Half a day | Slow, needs discipline |

---

## The App Review problem

This is the single thing that determines your timeline.

Reading leads from the Meta API needs the **`leads_retrieval`** permission. Meta grants it only after App Review, which requires:

1. A Meta App created under your Business Manager
2. **Business verification** — company documents, can itself take days
3. A screencast showing exactly how your app uses the permission
4. A written explanation of why you need it
5. A privacy policy URL that is live and reachable

Typical turnaround is **1–4 weeks**, occasionally longer if they ask for changes.

**Important nuance:** while your app is in *Development* mode you can pull leads from Pages you administer without approval. That means I can **build and fully test the integration before approval** — it just cannot process live leads from real customers until the app goes Live, which requires approval.

---

## What implementation involves (any option)

All four options need the same receiving end, which is most of the work:

**1. Database changes** — a migration adding to `public.enquiries`:
- `source` — `'website'` | `'meta'` | `'import'`, so you can tell them apart and report on them
- `external_id` — Meta's `leadgen_id`, **unique**, so a retried webhook cannot create a duplicate lead
- `raw_payload` (jsonb) — what Meta actually sent, so a field-mapping mistake is recoverable
- Backfill existing rows to `source = 'website'`

**2. A route handler** at `/api/leads/meta` that:
- Verifies the `X-Hub-Signature-256` header against the app secret — **this is the only thing preventing anyone on the internet from posting fake leads into your admin panel**
- Handles Meta's `GET` verification challenge
- Fetches lead detail from the Graph API using the page token
- Maps fields and inserts, ignoring duplicates on `external_id`
- Returns `200` fast; Meta times out aggressively and retries on anything else

**3. Admin panel changes**
- A source filter and badge on `/admin/enquiries` so Meta leads are visible at a glance
- The dashboard "New Enquiries" count picks them up automatically

**4. Two new server-only environment variables**
- `META_APP_SECRET`
- `META_PAGE_ACCESS_TOKEN`

⚠️ **This is a new pattern for this codebase.** Every existing variable is `NEXT_PUBLIC_*`, meaning it ships to the browser. These two must never be — a leaked page token lets someone read every lead your ad account has ever collected.

**5. A service-role Supabase key for the webhook**

The webhook inserts on behalf of Meta, not a browser, so it must bypass RLS.

⚠️ **This interacts with a control we shipped on 22 Aug.** Migration `010_enquiry_hardening.sql` rate-limits enquiry inserts to 5 per hour per source. Meta or Zapier sending 40 leads would be blocked from lead six onward. The webhook must insert with a service-role key (which bypasses RLS and the trigger), and that key must be server-only and never exposed.

---

## Field mapping

Meta lead forms return whatever questions you configured. Standard mapping:

| Meta field | → | `enquiries` column | Notes |
|---|---|---|---|
| `full_name` | → | `name` | |
| `phone_number` | → | `phone` | Meta returns E.164, e.g. `+919323063712` |
| `email` | → | `email` | |
| `city` | → | `departure_city` | Custom question on your form |
| package interest | → | `package_preference` | Custom question |
| anything else | → | `notes` | Concatenate remaining answers |
| `leadgen_id` | → | `external_id` | Deduplication key |
| `created_time` | → | `created_at` | Meta's timestamp, not receipt time |
| — | → | `source` = `'meta'` | |
| — | → | `status` = `'new'` | |

**Action item regardless of option:** check what questions your Meta lead form actually asks. If it only collects name and phone, the mapping is trivial. If it asks about travel dates or package type, those are worth capturing properly rather than dumping into `notes`.

---

## Recommendation

**Build the endpoint, start App Review immediately, and decide on the bridge based on your lead volume.**

1. **Now** — Submit for Meta App Review. It is free, the clock starts today, and it costs nothing to abandon. This is the long pole; everything else waits on it.
2. **Now** — I build the database changes, the endpoint, and the admin panel source filter. Works for all four options.
3. **Meanwhile, choose based on volume:**
   - **Over ~150 leads/month:** take the Zapier/Make bridge. At that volume the bridge costs a few rupees per lead for one month and you stop working out of a spreadsheet immediately.
   - **Under ~150 leads/month:** use manual CSV import (Option D) during the wait. At 50 leads a month the bridge works out around ₹40 per lead, which is hard to justify for a few weeks.
4. **On approval** — switch to the direct webhook, cancel any subscription. Ongoing cost returns to ₹0.

---

## Before implementation — checklist

Answer these and implementation is straightforward:

- [ ] Do you have **admin access** to the Meta Business account and the Facebook Page running the ads, or does an agency control it?
- [ ] Roughly **how many leads per month** do the Meta ads produce?
- [ ] What is your current **cost per lead**? (Determines whether the bridge is worth it.)
- [ ] What **questions does your lead form ask**? (Determines field mapping.)
- [ ] Is there a **live privacy policy URL**? App Review requires one, and the site does not appear to have a privacy policy page.
- [ ] Should the **spreadsheet keep filling** as a safety net, or stop once leads land on the site?
- [ ] Has **business verification** already been done on your Meta Business account? (If yes, App Review is materially faster.)

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| App Review rejected or delayed | Medium | Bridge option keeps leads flowing; resubmission is allowed |
| Page access token revoked (password change, admin removed) | Medium | Health check that alerts when the token stops working |
| Webhook endpoint down > 36h | Low | Meta retries for ~36h; beyond that, manual CSV recovery |
| Duplicate leads from retries | High without mitigation | `external_id` unique constraint — planned |
| Fake leads posted to the endpoint | High without mitigation | Signature verification — planned, non-optional |
| Service-role key leaked | Low, severe | Server-only env var, never `NEXT_PUBLIC_*`, rotate on suspicion |
| Third party breaks silently (Option B) | Medium | Alert if no Meta lead received in 48h |

---

## Open question worth deciding early

**Should Meta leads be treated identically to website leads, or differently?**

They arrive with less information — no travel date, no party size, often no email. If they land in the same list looking the same, staff may not realise a Meta lead needs a longer qualifying call.

Options: a coloured source badge (cheapest), a separate tab, or different default follow-up notes. My suggestion is the badge plus a source filter — visible, low effort, and reversible.
