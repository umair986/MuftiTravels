# Importing a package from a flyer

About half the packages the business sells arrive as a supplier flyer: tiers,
hotels, sharing prices, departure dates and an inclusions list on one image.
Retyping it into the package editor is slow and is where wrong digits come
from. The editor's **Import from flyer JSON** button replaces the retyping:

1. **Copy ChatGPT prompt** in the dialog, paste it into ChatGPT, attach the flyer.
2. Paste ChatGPT's reply into the dialog (or upload it as a `.json` file).
3. Read the preview — what changes, what was not imported, which hotels differ.
4. **Apply to form**, check the form, **Save package**.

Code: `src/lib/packageImport.ts` (pure parser, prompt, example — tested in
`packageImport.test.ts`), `src/app/admin/packages/ImportPackageDialog.tsx`, and
`applyImported` / `formToImported` in `src/app/admin/ManagedPackageEditor.tsx`.
No migration.

## Decisions

**1. Import fills the form; it never saves.** A model reading an image misreads
digits — the flyer this was built from prints `₹1,62.786/-`. The admin sees the
result in the ordinary form with the ordinary "unsaved changes" bar, and nothing
reaches the site until they click Save. The save path, and therefore RLS, is
unchanged. *Rejected:* creating or saving the package straight from the JSON.

**2. Doubt becomes a warning, never a guess.** An amount that is not an
unambiguous whole number of rupees, a tier that is not in Tags & Tiers, a
category outside `PACKAGE_CATEGORIES`, a date that is not a real `YYYY-MM-DD` —
each is skipped and listed under "Not imported". The prompt asks ChatGPT to copy
a misprinted price as printed, as a string, precisely so it is flagged here
rather than silently "corrected" by the model. *Rejected:* fuzzy tier matching
("Economic" → "Economy"); a wrong tier is a wrong price.

**3. Missing means keep.** A field that is absent or `null` leaves the form as
it is. Prices are the exception in kind, not in rule: when the JSON has a
`prices` list, it replaces the whole table, because a flyer is the full price
list and merging would leave last month's rows beside this month's.

**4. Hotels go on the package, never the tier.** The first version only
compared the flyer's hotels with the tier's, because hotel name and distance
were a tier fact (monthly-packages.md Decision 13). On the first real flyer
every tier "differed" — the hotel moves with the supplier and the month, which
the tier cannot express without rewriting every other package in it. Migration
032 adds `packages.tier_hotels`: per tier key, the four hotel fields, each
falling back to the tier when blank (`withPackageHotels()`). The import writes
there, replacing the package's set like it replaces prices. Stars and highlights
stay tier-only. *Rejected:* moving the columns off `package_tiers` — every live
package would lose its hotels until re-entered.

**5. The prompt names the live tiers.** `packageImportPrompt()` is built from
the tiers loaded in the editor, so ChatGPT maps "Super Deluxe Package" onto what
the business actually calls that tier. Matching on our side then only ignores
case, punctuation and a trailing "Package".

**6. Pre-migration rows lose the columns they lack.** A package read before 026
or 028 has no city, month or flight columns; the import drops those values with
a warning, following the editor's own `"column" in record` guards.

## The JSON

`PACKAGE_IMPORT_EXAMPLE` in `src/lib/packageImport.ts` is the canonical example
(the 20-day Shabaan/Ramzan flyer) and is what the dialog's "Download
example.json" returns. Fields: `name`, `description`, `category`,
`departure_city`, `duration_days`, `duration_nights`, `makkah_nights`,
`madinah_nights`, `destinations`, `valid_month`, `valid_until_month`
(`YYYY-MM`), `departure_dates` (`YYYY-MM-DD`), `airline`, `flight_routing`
(`direct` / `via` / null), `flight_via`, `prices` (`{ tier, sharing, amount }`),
`hotels` (onto this package, per tier), `features`, `notes` (shown only).
