import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { CmsPackageRecord } from "@/lib/packages";
import {
  applyImported,
  cardPriceValue,
  formToUpdate,
  recordToForm,
} from "@/lib/packageForm";

/** A row as PostgREST returns it before migrations 026–032 are applied. */
const preMigrationRow = {
  id: "p1",
  slug: "umrah-nov",
  category: "Umrah Fixed Group",
  name: "Umrah November",
  description: "",
  image_url: "",
  duration_days: 15,
  duration_nights: 14,
  destinations: "Makkah, Madinah",
  features: ["Visa", "Ziyarat"],
  prices: { Gold: { Quad: 95000, Double: 120000 } },
  starting_price: 95000,
  currency: "INR",
  reviews: 0,
  rating: 5,
  is_published: true,
  sort_order: 0,
} as unknown as CmsPackageRecord;

const currentRow = {
  ...preMigrationRow,
  details: {},
  departure_city: "mumbai",
  valid_month: "2026-11-01",
  valid_until_month: null,
  departure_dates: [],
  airline: "",
  flight_routing: "",
  flight_via: "",
  card_price_tier: "",
  card_price_sharing: "",
  tier_hotels: {},
} as CmsPackageRecord;

describe("formToUpdate", () => {
  it("round-trips a row through the form", () => {
    const update = formToUpdate(recordToForm(currentRow), currentRow);
    assert.deepEqual(update.prices, currentRow.prices);
    assert.equal(update.starting_price, 95000);
    assert.equal(update.valid_month, "2026-11-01");
    assert.equal(update.valid_until_month, null);
    assert.deepEqual(update.features, ["Visa", "Ziyarat"]);
  });

  it("writes no column the loaded row lacks", () => {
    const update = formToUpdate(recordToForm(preMigrationRow), preMigrationRow);
    for (const column of [
      "details",
      "departure_city",
      "valid_until_month",
      "tier_hotels",
      "card_price_tier",
    ]) {
      assert.ok(!(column in update), `${column} would fail a pre-migration save`);
    }
  });

  it("starts from the lowest positive amount and drops empty rows", () => {
    const form = recordToForm(currentRow);
    form.prices = [
      { id: 1, tier: "Gold", sharing: "Quad", amount: "0" },
      { id: 2, tier: "Gold", sharing: "Triple", amount: "" },
      { id: 3, tier: "Silver", sharing: "Quad", amount: "80000" },
    ];
    const update = formToUpdate(form, currentRow);
    assert.equal(update.starting_price, 80000);
    assert.deepEqual(update.prices, { Silver: { Quad: 80000 } });
  });

  it("saves an end month only when it is after the start", () => {
    const form = { ...recordToForm(currentRow), validUntilMonth: "2026-10" };
    assert.equal(formToUpdate(form, currentRow).valid_until_month, null);
    form.validUntilMonth = "2026-12";
    assert.equal(formToUpdate(form, currentRow).valid_until_month, "2026-12-01");
  });

  it("splits the card-price pick back into tier and sharing", () => {
    const form = { ...recordToForm(currentRow), cardPrice: cardPriceValue("Gold", "Double") };
    const update = formToUpdate(form, currentRow);
    assert.equal(update.card_price_tier, "Gold");
    assert.equal(update.card_price_sharing, "Double");
  });

  it("clears the stop unless the flight is via one", () => {
    const form = { ...recordToForm(currentRow), flightRouting: "direct" as const, flightVia: "Doha" };
    assert.equal(formToUpdate(form, currentRow).flight_via, "");
  });
});

describe("applyImported", () => {
  it("drops a card-price pick whose row the imported prices removed", () => {
    const form = { ...recordToForm(currentRow), cardPrice: cardPriceValue("Gold", "Double") };
    const next = applyImported(form, {
      prices: [{ tier: "Gold", sharing: "Quad", amount: 90000 }],
    });
    assert.equal(next.cardPrice, "");
    assert.equal(next.prices.length, 1);
  });

  it("resets the end month when the import sets a new start", () => {
    const form = { ...recordToForm(currentRow), validUntilMonth: "2026-12" };
    assert.equal(applyImported(form, { validMonth: "2027-01" }).validUntilMonth, "");
  });
});
