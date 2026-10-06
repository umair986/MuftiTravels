/**
 * Tests for the catalogue bridge.
 *
 * Only the pure half — fetchQuotablePackages needs a Supabase client and is
 * exercised by using the picker. What is tested here is the part that decides
 * what an admin is offered mid-phone-call, and the part that stops a character
 * disappearing out of a customer-facing PDF.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  composeLineDescription,
  pdfSafeText,
  ratesForPackage,
  tierKeysForPackage,
  type QuotablePackage,
} from "./packages.client";
import type { PackageTierRecord } from "./taxonomy";

/** The seeded ladder from migration 006, in its real order. */
const TIERS: PackageTierRecord[] = [
  { id: "1", key: "super-saver", name: "Super Saver", sort_order: 10 },
  { id: "2", key: "bronze", name: "Bronze", sort_order: 20 },
  { id: "3", key: "silver", name: "Silver", sort_order: 30 },
  { id: "4", key: "gold", name: "Gold", sort_order: 40 },
  { id: "5", key: "platinum", name: "Platinum", sort_order: 50 },
];

function pkg(overrides: Partial<QuotablePackage> = {}): QuotablePackage {
  return {
    slug: "15-days-regular-umrah-from-mumbai",
    name: "15 Days Regular Umrah",
    category: "Umrah Fixed Group",
    durationDays: 15,
    durationNights: 14,
    destinations: "Makkah, Madinah",
    features: ["Visa", "Return flights", "Ziyarat"],
    prices: {
      silver: { Quad: 110000, Triple: 118000 },
      gold: { Quad: 134000 },
    },
    ...overrides,
  };
}

describe("ratesForPackage", () => {
  it("converts the catalogue's rupees into paise", () => {
    const rates = ratesForPackage(pkg(), TIERS);
    const silverQuad = rates.find(
      (rate) => rate.tierKey === "silver" && rate.sharing === "Quad",
    );
    assert.equal(silverQuad?.unitPricePaise, 11_000_000); // ₹1,10,000
  });

  it("resolves the tier's display name, never the key", () => {
    // The whole reason packages reference tiers by stable key: renaming the tier
    // is a one-row update, and nothing should ever show "super-saver".
    const rates = ratesForPackage(pkg(), TIERS);
    assert.equal(rates[0]?.tierLabel, "Silver");
    assert.ok(!rates.some((rate) => rate.tierLabel.includes("-")));
  });

  it("walks the ladder in registry order, not jsonb order", () => {
    // prices here lists gold first; the picker must still offer Silver before it.
    const scrambled = pkg({
      prices: {
        platinum: { Quad: 180000 },
        silver: { Quad: 110000 },
        gold: { Quad: 134000 },
      },
    });
    const order = ratesForPackage(scrambled, TIERS).map((rate) => rate.tierKey);
    assert.deepEqual(order, ["silver", "gold", "platinum"]);
  });

  it("reads a row still keyed by display name, as migration 003 seeded them", () => {
    // 003 wrote prices keyed by name; 006 re-keys to stable keys and drops what
    // it cannot match. A row that has not been through that re-key must not come
    // back with zero rates — which is what looking up only tier.key would do.
    const unmigrated = pkg({
      prices: { Silver: { Quad: 64786 }, Gold: { Quad: 74786 } },
    });
    const rates = ratesForPackage(unmigrated, TIERS);
    assert.deepEqual(
      rates.map((rate) => [rate.tierKey, rate.sharing, rate.unitPricePaise]),
      [
        ["silver", "Quad", 6_478_600],
        ["gold", "Quad", 7_478_600],
      ],
    );
    // Still reported under the stable key, so the picker groups consistently.
    assert.equal(rates[0].tierLabel, "Silver");
  });

  it("does not double-count a row that holds both forms", () => {
    const both = pkg({
      prices: { silver: { Quad: 110000 }, Silver: { Quad: 64786 } },
    });
    const rates = ratesForPackage(both, TIERS);
    // The stable key wins; the legacy duplicate is not offered a second time.
    assert.equal(rates.length, 1);
    assert.equal(rates[0].unitPricePaise, 11_000_000);
  });

  it("still offers a tier that has been deleted from the registry", () => {
    // A tier removed from package_tiers does not un-price a live package, and an
    // admin on a call needs the rate that is actually on the row.
    const legacy = pkg({ prices: { "monsoon-special": { Quad: 99000 } } });
    const rates = ratesForPackage(legacy, TIERS);
    assert.equal(rates.length, 1);
    assert.equal(rates[0].tierKey, "monsoon-special");
    // tierName de-slugs an unknown reference rather than showing the key.
    assert.equal(rates[0].tierLabel, "Monsoon Special");
  });

  it("drops gaps rather than offering a free holiday", () => {
    // A missing or zero rate is a hole in the catalogue. Putting ₹0 in front of
    // an admin mid-call is worse than not offering the combination.
    const gappy = pkg({
      prices: {
        silver: {
          Quad: 110000,
          Triple: 0,
          Double: undefined,
          Child: "94000" as unknown as number,
        },
      },
    });
    const sharings = ratesForPackage(gappy, TIERS).map((rate) => rate.sharing);
    assert.deepEqual(sharings, ["Quad"]);
  });

  it("is empty for a package with no prices at all", () => {
    assert.deepEqual(ratesForPackage(pkg({ prices: {} }), TIERS), []);
  });
});

describe("tierKeysForPackage", () => {
  it("lists each priced tier once, in ladder order", () => {
    assert.deepEqual(tierKeysForPackage(pkg(), TIERS), ["silver", "gold"]);
  });
});

describe("pdfSafeText", () => {
  it("turns a star rating into letters the PDF font can draw", () => {
    // Noto Sans has no glyph for ★ and @react-pdf/renderer does not complain —
    // the character silently vanishes, so "Makkah 4★" would reach a customer
    // reading "Makkah 4".
    assert.equal(pdfSafeText("Makkah 4★ Hotel"), "Makkah 4-star Hotel");
    assert.equal(pdfSafeText("Madinah 5 ★"), "Madinah 5-star");
  });

  it("removes a star that is not rating anything", () => {
    assert.equal(pdfSafeText("★ Featured"), "Featured");
  });

  it("leaves text the font can draw alone", () => {
    // The middot and the rupee sign are both in Noto Sans; only the star is not.
    assert.equal(
      pdfSafeText("15 Days Regular Umrah · Silver · Quad"),
      "15 Days Regular Umrah · Silver · Quad",
    );
  });
});

describe("composeLineDescription", () => {
  it("reads as the sales conversation did", () => {
    assert.equal(
      composeLineDescription(pkg(), { tierLabel: "Silver", sharing: "Quad" }),
      "15 Days Regular Umrah · Silver · Quad",
    );
  });

  it("sanitises the package name on the way through", () => {
    assert.equal(
      composeLineDescription(pkg({ name: "Umrah · Makkah 4★" }), {
        tierLabel: "Gold",
        sharing: "Triple",
      }),
      "Umrah · Makkah 4-star · Gold · Triple",
    );
  });
});
