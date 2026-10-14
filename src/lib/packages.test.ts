import { test } from "node:test";
import assert from "node:assert/strict";
import { cardPrice } from "./packages";

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
