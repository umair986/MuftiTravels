/**
 * Tests for reading a ChatGPT-made package JSON into the editor's fields.
 *
 * The JSON is written by a model reading a flyer, so the failures pinned here
 * are the ones that would otherwise reach a customer as a wrong price: a
 * misprinted amount guessed into a number, a tier silently snapped to another.
 * Node's built-in runner: `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PACKAGE_IMPORT_EXAMPLE,
  importChanges,
  matchCity,
  packageImportPrompt,
  parseAmount,
  parsePackageImport,
} from "./packageImport";

const TIERS = [
  { key: "budget", name: "Budget" },
  { key: "economic", name: "Economic" },
  { key: "deluxe", name: "Deluxe" },
  { key: "super-deluxe", name: "Super Deluxe" },
];

function parse(value: unknown, options = {}) {
  return parsePackageImport(
    typeof value === "string" ? value : JSON.stringify(value),
    { tiers: TIERS, ...options },
  );
}

describe("parseAmount", () => {
  it("reads plain, Western and Indian groupings with symbols", () => {
    assert.equal(parseAmount(96786), 96786);
    assert.equal(parseAmount("96,786"), 96786);
    assert.equal(parseAmount("₹ 1,16,786/-"), 116786);
    assert.equal(parseAmount("Rs. 135786.00"), 135786);
    assert.equal(parseAmount("162,786"), 162786);
  });

  it("refuses ambiguous or non-positive amounts rather than guessing", () => {
    assert.equal(parseAmount("1,62.786"), undefined);
    assert.equal(parseAmount("1,6,2786"), undefined);
    assert.equal(parseAmount(1627.86), undefined);
    assert.equal(parseAmount(0), undefined);
    assert.equal(parseAmount("-5"), undefined);
    assert.equal(parseAmount(null), undefined);
  });
});

describe("parsePackageImport", () => {
  it("reads the example flyer completely", () => {
    const result = parse(PACKAGE_IMPORT_EXAMPLE);
    assert.ok(result.ok);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.data.category, "Ramzan");
    assert.equal(result.data.departureCity, "mumbai");
    assert.equal(result.data.validMonth, "2027-01");
    assert.equal(result.data.validUntilMonth, "2027-02");
    assert.deepEqual(result.data.departureDates, ["2027-01-30", "2027-02-01"]);
    assert.deepEqual(result.data.prices, [
      { tier: "budget", sharing: "Sharing", amount: 96786 },
      { tier: "economic", sharing: "Sharing", amount: 116786 },
      { tier: "deluxe", sharing: "Sharing", amount: 135786 },
      { tier: "super-deluxe", sharing: "Sharing", amount: 162786 },
    ]);
    assert.equal(result.data.features?.length, 11);
    assert.equal(result.notes, "Booking with 50% advance (non-refundable).");
    // Nights the flyer does not state stay absent, so the form keeps its own.
    assert.equal("makkahNights" in result.data, false);
    assert.equal("airline" in result.data, false);
  });

  it("takes the JSON out of a fenced ChatGPT reply", () => {
    const reply = `Here is the JSON:\n\`\`\`json\n{"name": "Test"}\n\`\`\`\nLet me know!`;
    const result = parse(reply);
    assert.ok(result.ok);
    assert.equal(result.data.name, "Test");
  });

  it("matches tiers by name or key, ignoring case and a 'Package' suffix", () => {
    const result = parse({
      prices: [
        { tier: "SUPER DELUXE PACKAGE", sharing: "Quad", amount: 1 },
        { tier: "super-deluxe", sharing: "Double", amount: 2 },
      ],
    });
    assert.ok(result.ok);
    assert.deepEqual(
      result.data.prices?.map((row) => row.tier),
      ["super-deluxe", "super-deluxe"],
    );
  });

  it("skips an unknown tier and a misprinted amount with a warning each", () => {
    const result = parse({
      prices: [
        { tier: "Platinum", sharing: "Sharing", amount: 200000 },
        { tier: "Super Deluxe", sharing: "Sharing", amount: "1,62.786" },
        { tier: "Budget", sharing: "Sharing", amount: "96,786" },
      ],
    });
    assert.ok(result.ok);
    assert.deepEqual(result.data.prices, [
      { tier: "budget", sharing: "Sharing", amount: 96786 },
    ]);
    assert.equal(result.warnings.length, 2);
    assert.match(result.warnings[0], /Platinum/);
    assert.match(result.warnings[1], /1,62\.786/);
  });

  it("rejects impossible dates and months", () => {
    const result = parse({
      name: "x",
      valid_month: "2027-13",
      departure_dates: ["2027-02-30", "2027-01-30", "2027-01-30", "30 Jan"],
    });
    assert.ok(result.ok);
    assert.equal(result.data.validMonth, undefined);
    assert.deepEqual(result.data.departureDates, ["2027-01-30"]);
    assert.equal(result.warnings.length, 3);
  });

  it("drops an end month that is not after the start", () => {
    const result = parse({ valid_month: "2027-02", valid_until_month: "2027-01" });
    assert.ok(result.ok);
    assert.equal(result.data.validUntilMonth, undefined);
    assert.equal(result.warnings.length, 1);
  });

  it("never reads a missing routing as direct", () => {
    const blank = parse({ name: "x", airline: "Saudia", flight_routing: null });
    assert.ok(blank.ok);
    assert.equal(blank.data.flightRouting, undefined);
    const via = parse({ flight_via: "Muscat" });
    assert.ok(via.ok);
    assert.equal(via.data.flightRouting, "via");
    assert.equal(via.data.flightVia, "Muscat");
  });

  it("drops the columns a pre-026/028 row lacks", () => {
    const result = parse(PACKAGE_IMPORT_EXAMPLE, {
      hasCityColumns: false,
      hasFlightColumns: false,
    });
    assert.ok(result.ok);
    assert.equal(result.data.departureCity, undefined);
    assert.equal(result.data.validMonth, undefined);
    assert.equal(result.data.departureDates, undefined);
    assert.ok(result.warnings.some((warning) => /026/.test(warning)));
    assert.ok(result.data.prices?.length);
  });

  it("puts the flyer's hotels on the package, per tier", () => {
    const result = parse(PACKAGE_IMPORT_EXAMPLE);
    assert.ok(result.ok);
    assert.deepEqual(Object.keys(result.data.tierHotels ?? {}), [
      "budget",
      "economic",
      "deluxe",
      "super-deluxe",
    ]);
    assert.deepEqual(result.data.tierHotels?.["super-deluxe"], {
      makkah_hotel: "Elaf Diamond",
      makkah_distance: "300 m",
      madinah_hotel: "Gulnar Taiba",
      madinah_distance: "0 m",
    });
  });

  it("skips hotels for an unknown tier, and all hotels before 032", () => {
    const unknown = parse({
      hotels: [
        { tier: "Platinum", makkah_hotel: "X" },
        { tier: "Budget", makkah_hotel: "Y", madinah_hotel: null },
      ],
    });
    assert.ok(unknown.ok);
    assert.deepEqual(unknown.data.tierHotels, { budget: { makkah_hotel: "Y" } });
    assert.equal(unknown.warnings.length, 1);

    const before = parse(PACKAGE_IMPORT_EXAMPLE, { hasHotelColumn: false });
    assert.ok(before.ok);
    assert.equal(before.data.tierHotels, undefined);
    assert.ok(before.warnings.some((warning) => /032/.test(warning)));
  });

  it("refuses invalid JSON, a non-object, and an all-empty object", () => {
    assert.equal(parse("not json at all").ok, false);
    assert.equal(parse("[1, 2]").ok, false);
    assert.equal(parse({ name: null, notes: "x" }).ok, false);
  });

  it("warns about unknown fields and an unknown category", () => {
    const result = parse({ name: "x", category: "Holiday", price_total: 5 });
    assert.ok(result.ok);
    assert.equal(result.data.category, undefined);
    assert.equal(result.warnings.length, 2);
  });
});

describe("importChanges", () => {
  it("lists only fields that differ, formatted for people", () => {
    const changes = importChanges(
      { name: "Same", departureCity: "" },
      {
        name: "Same",
        departureCity: "mumbai",
        prices: [{ tier: "budget", sharing: "Sharing", amount: 96786 }],
      },
      TIERS,
    );
    assert.deepEqual(changes, [
      { label: "Departs from", before: "—", after: "Mumbai" },
      { label: "Prices", before: "—", after: "Budget · Sharing — ₹96,786" },
    ]);
  });
});

describe("helpers", () => {
  it("matches a city written the way flyers write it", () => {
    assert.equal(matchCity("Ex Mumbai"), "mumbai");
    assert.equal(matchCity("DELHI"), "delhi");
    assert.equal(matchCity("Pune"), undefined);
  });

  it("names the live tiers in the prompt", () => {
    const prompt = packageImportPrompt(["Budget", "Super Deluxe"]);
    assert.match(prompt, /"Budget", "Super Deluxe"/);
    assert.match(prompt, /"prices"/);
  });
});
