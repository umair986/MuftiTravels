import { test } from "node:test";
import assert from "node:assert/strict";
import { cardPrice, packageMetaDescription } from "./packages";
import { cleanTierHotels, withPackageHotels } from "./taxonomy";

// Keys in the order Postgres returns jsonb: by length, so "Quad" before
// "Double" whatever their prices — the order the old card logic trusted.
const prices = {
  silver: { Quad: 120000, Double: 150000 },
  "super-saver": { Quad: 95000, Triple: 99000, Double: 90000 },
} as never;

test("cardPrice: no pick shows the lowest amount across every tier and sharing", () => {
  assert.deepEqual(cardPrice({ prices }), {
    tier: "super-saver",
    sharing: "Double",
    amount: 90000,
  });
});

test("cardPrice: a pick that names a priced cell wins over the lowest", () => {
  assert.deepEqual(
    cardPrice({ prices, card_price_tier: "silver", card_price_sharing: "Quad" }),
    { tier: "silver", sharing: "Quad", amount: 120000 },
  );
});

test("cardPrice: a pick whose row was removed falls back to the lowest", () => {
  assert.equal(
    cardPrice({ prices, card_price_tier: "gold", card_price_sharing: "Quad" })
      ?.amount,
    90000,
  );
});

test("cardPrice: a half-set pick, or a row from before 027, means lowest", () => {
  assert.equal(
    cardPrice({ prices, card_price_tier: "silver", card_price_sharing: "" })
      ?.amount,
    90000,
  );
});

test("cardPrice: nothing priced is undefined, never zero", () => {
  assert.equal(cardPrice({ prices: {} as never }), undefined);
  assert.equal(
    cardPrice({ prices: { silver: { Quad: 0 } } as never }),
    undefined,
  );
});

test("packageMetaDescription: stay and price, with the closing line when it fits", () => {
  assert.equal(
    packageMetaDescription({
      name: "15 Days Umrah Mumbai",
      duration_days: 15,
      details: { makkah_nights: 7, madinah_nights: 7 },
      prices,
      currency: "INR",
    }),
    "15 Days Umrah Mumbai: 7 nights Makkah + 7 nights Madinah, from ₹90,000 per person. Arranged by Mufti Travels, Mumbai.",
  );
});

test("packageMetaDescription: unpriced and without nights falls back to days and no price", () => {
  assert.equal(
    packageMetaDescription({
      name: "Shorter Hajj Package",
      duration_days: 21,
      prices: {} as never,
      currency: "INR",
    }),
    "Shorter Hajj Package: 21 days. Arranged by Mufti Travels, Mumbai.",
  );
});

test("packageMetaDescription: never exceeds 160 characters", () => {
  const description = packageMetaDescription({
    name: "A".repeat(200),
    duration_days: 15,
    details: { makkah_nights: 7, madinah_nights: 7 },
    prices,
    currency: "INR",
  });
  assert.ok(description.length <= 160, `${description.length} characters`);
});

test("withPackageHotels: a package's hotel overrides its tier, blanks fall back", () => {
  const registry = [
    { id: "1", key: "deluxe", name: "Deluxe", sort_order: 1, makkah_hotel: "Old", makkah_distance: "500 m", madinah_distance: "100 m" },
    { id: "2", key: "budget", name: "Budget", sort_order: 0, makkah_distance: "1500 m" },
  ];
  const seen = withPackageHotels(registry, {
    deluxe: { makkah_hotel: "Waha Deafah", madinah_distance: "  " },
  });
  assert.equal(seen[0].makkah_hotel, "Waha Deafah");
  assert.equal(seen[0].makkah_distance, "500 m");
  assert.equal(seen[0].madinah_distance, "100 m");
  assert.equal(seen[1], registry[1]);
  // A row read before migration 032 has no overrides at all.
  assert.equal(withPackageHotels(registry, undefined), registry);
});

test("cleanTierHotels: trims, drops blanks and tiers the package no longer prices", () => {
  assert.deepEqual(
    cleanTierHotels(
      {
        deluxe: { makkah_hotel: " Waha Deafah ", madinah_hotel: "" },
        budget: { makkah_hotel: "Gone" },
        gold: { makkah_hotel: "  " },
      },
      ["deluxe", "gold"],
    ),
    { deluxe: { makkah_hotel: "Waha Deafah" } },
  );
});
