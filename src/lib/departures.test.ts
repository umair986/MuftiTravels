/**
 * Tests for the package-month arithmetic.
 *
 * The rule the business asked for is exact: October's packages disappear at
 * midnight on 1 November, India time — not at 05:30, which is when UTC says
 * November begins. That boundary is pinned here from both sides.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cityKeyFromName,
  cityName,
  compareNewestMonthFirst,
  currentIstMonth,
  formatMonth,
  fromMonthInput,
  isCityKey,
  isMonthExpired,
  nextMonth,
  packageCity,
  renameForMonth,
  toMonthInput,
} from "./departures";

describe("currentIstMonth", () => {
  it("turns over at midnight in India, not midnight UTC", () => {
    // 31 Oct 18:29 UTC is 23:59 IST on the 31st — still October.
    assert.equal(currentIstMonth(new Date("2026-10-31T18:29:00Z")), "2026-10-01");
    // 31 Oct 18:30 UTC is 00:00 IST on 1 November.
    assert.equal(currentIstMonth(new Date("2026-10-31T18:30:00Z")), "2026-11-01");
  });

  it("rolls the year at New Year in India", () => {
    assert.equal(currentIstMonth(new Date("2026-12-31T18:30:00Z")), "2027-01-01");
  });
});

describe("isMonthExpired", () => {
  const seventhOfOctober = new Date("2026-10-07T06:00:00Z");

  it("expires every month before this one", () => {
    assert.equal(isMonthExpired("2026-09-01", seventhOfOctober), true);
    assert.equal(isMonthExpired("2025-12-01", seventhOfOctober), true);
  });

  it("keeps this month and every later one", () => {
    // Made early, live now: the admin may publish November in October.
    assert.equal(isMonthExpired("2026-10-01", seventhOfOctober), false);
    assert.equal(isMonthExpired("2026-11-01", seventhOfOctober), false);
  });

  it("expires October at midnight IST on 1 November", () => {
    assert.equal(isMonthExpired("2026-10-01", new Date("2026-10-31T18:29:00Z")), false);
    assert.equal(isMonthExpired("2026-10-01", new Date("2026-10-31T18:30:00Z")), true);
  });

  it("never expires a package with no month", () => {
    // Hajj and Ramadan.
    assert.equal(isMonthExpired(null, seventhOfOctober), false);
    assert.equal(isMonthExpired(undefined, seventhOfOctober), false);
    assert.equal(isMonthExpired("", seventhOfOctober), false);
  });
});

describe("formatMonth", () => {
  it("names the month", () => {
    assert.equal(formatMonth("2026-11-01"), "November 2026");
    assert.equal(formatMonth("2027-03-01"), "March 2027");
  });

  it("is empty for no month or nonsense", () => {
    assert.equal(formatMonth(null), "");
    assert.equal(formatMonth("2026-13-01"), "");
    assert.equal(formatMonth("soon"), "");
  });
});

describe("nextMonth", () => {
  it("steps one month, rolling the year after December", () => {
    assert.equal(nextMonth("2026-10-01"), "2026-11-01");
    assert.equal(nextMonth("2026-12-01"), "2027-01-01");
  });
});

describe("month inputs", () => {
  it("round-trips through <input type=month>", () => {
    assert.equal(toMonthInput("2026-11-01"), "2026-11");
    assert.equal(fromMonthInput("2026-11"), "2026-11-01");
    assert.equal(toMonthInput(null), "");
    assert.equal(fromMonthInput(""), null);
  });
});

describe("compareNewestMonthFirst", () => {
  it("puts the newest month first and undated packages last", () => {
    const sorted = [
      { name: "undated", valid_month: null, sort_order: 0 },
      { name: "oct", valid_month: "2026-10-01", sort_order: 0 },
      { name: "nov-b", valid_month: "2026-11-01", sort_order: 2 },
      { name: "nov-a", valid_month: "2026-11-01", sort_order: 1 },
    ]
      .sort(compareNewestMonthFirst)
      .map((item) => item.name);
    assert.deepEqual(sorted, ["nov-a", "nov-b", "oct", "undated"]);
  });
});

describe("renameForMonth", () => {
  it("swaps the month already in the name", () => {
    assert.equal(
      renameForMonth("15 Days Umrah from Mumbai — October 2026", "2026-10-01", "2026-11-01"),
      "15 Days Umrah from Mumbai — November 2026",
    );
  });

  it("appends the month when the name has none", () => {
    assert.equal(
      renameForMonth("15 Days Umrah from Mumbai", null, "2026-11-01"),
      "15 Days Umrah from Mumbai — November 2026",
    );
  });
});

describe("cities", () => {
  it("knows its six cities and nothing else", () => {
    assert.equal(cityName("bangalore"), "Bangalore");
    assert.equal(cityName(""), "");
    assert.equal(isCityKey("ahmedabad"), true);
    assert.equal(isCityKey("pune"), false);
  });
});

describe("cityKeyFromName", () => {
  it("accepts keys, display names and Bengaluru", () => {
    assert.equal(cityKeyFromName("mumbai"), "mumbai");
    assert.equal(cityKeyFromName("Mumbai"), "mumbai");
    assert.equal(cityKeyFromName(" Bengaluru "), "bangalore");
  });

  it("is null for anything that is not one of the six", () => {
    assert.equal(cityKeyFromName("All India"), null);
    assert.equal(cityKeyFromName(""), null);
    assert.equal(cityKeyFromName(undefined), null);
  });
});

describe("packageCity", () => {
  it("trusts the column once migration 026 has added it", () => {
    assert.equal(packageCity({ slug: "15-days-umrah-from-mumbai", departure_city: "delhi" }), "delhi");
    assert.equal(packageCity({ slug: "15-days-umrah-from-mumbai", departure_city: "" }), "");
  });

  it("falls back to the slug on a row read before 026", () => {
    assert.equal(packageCity({ slug: "15-days-regular-umrah-from-mumbai" }), "mumbai");
    assert.equal(packageCity({ slug: "umrah-from-bengaluru-november" }), "bangalore");
    assert.equal(packageCity({ slug: "umrah-plus-dubai" }), "");
  });

  it("matches whole words only", () => {
    // "mumbaikar" is not Mumbai.
    assert.equal(packageCity({ slug: "mumbaikar-special" }), "");
  });
});
