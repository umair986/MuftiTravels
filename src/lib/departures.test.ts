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
  flightCarrier,
  formatDepartureDates,
  formatMonth,
  formatPeriod,
  fromMonthInput,
  isCityKey,
  isMonthExpired,
  isPackageExpired,
  nextMonth,
  nextPeriod,
  packageEndMonth,
  packageCity,
  renameForMonth,
  renameForPeriod,
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
  it("puts the newest month first, cheapest within it, unpriced and undated last", () => {
    const sorted = [
      { name: "undated", valid_month: null, starting_price: 50000 },
      { name: "oct", valid_month: "2026-10-01", starting_price: 90000 },
      { name: "nov-b", valid_month: "2026-11-01", starting_price: 0 },
      { name: "nov-a", valid_month: "2026-11-01", starting_price: 120000 },
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

/* -------------------------------------------------------------------------- */
/* Periods (migration 028): rates fixed for a run of months                   */
/* -------------------------------------------------------------------------- */

describe("isPackageExpired", () => {
  const novDec = { valid_month: "2026-11-01", valid_until_month: "2026-12-01" };

  it("keeps November–December rates on the site through December", () => {
    // 15 Dec IST — November is over, December is not.
    assert.equal(isPackageExpired(novDec, new Date("2026-12-15T06:00:00Z")), false);
  });

  it("expires them at midnight IST on 1 January", () => {
    assert.equal(isPackageExpired(novDec, new Date("2026-12-31T18:29:00Z")), false);
    assert.equal(isPackageExpired(novDec, new Date("2026-12-31T18:30:00Z")), true);
  });

  it("reads a row from before 028 (no end column) as its one month", () => {
    assert.equal(
      isPackageExpired({ valid_month: "2026-11-01" }, new Date("2026-12-01T06:00:00Z")),
      true,
    );
  });

  it("ignores an end before the start rather than expiring early", () => {
    const backwards = { valid_month: "2026-11-01", valid_until_month: "2026-10-01" };
    assert.equal(packageEndMonth(backwards), "2026-11-01");
  });

  it("never expires an undated package, whatever its end says", () => {
    assert.equal(isPackageExpired({ valid_month: null, valid_until_month: "2020-01-01" }), false);
  });
});

describe("formatPeriod", () => {
  it("names one month, a run within a year, and a run across New Year", () => {
    assert.equal(formatPeriod({ valid_month: "2026-11-01" }), "November 2026");
    assert.equal(
      formatPeriod({ valid_month: "2026-11-01", valid_until_month: "2026-12-01" }),
      "November–December 2026",
    );
    assert.equal(
      formatPeriod({ valid_month: "2026-12-01", valid_until_month: "2027-01-01" }),
      "December 2026–January 2027",
    );
  });

  it("reads an end equal to the start as one month", () => {
    assert.equal(
      formatPeriod({ valid_month: "2026-11-01", valid_until_month: "2026-11-01" }),
      "November 2026",
    );
  });
});

describe("nextPeriod", () => {
  const october = "2026-10-01";

  it("follows November–December with January–February", () => {
    assert.deepEqual(
      nextPeriod({ valid_month: "2026-11-01", valid_until_month: "2026-12-01" }, october),
      { valid_month: "2027-01-01", valid_until_month: "2027-02-01" },
    );
  });

  it("follows one month with the next one month", () => {
    assert.deepEqual(nextPeriod({ valid_month: "2026-11-01" }, october), {
      valid_month: "2026-12-01",
      valid_until_month: null,
    });
  });

  it("starts this month, same length, when the original is long over", () => {
    assert.deepEqual(
      nextPeriod({ valid_month: "2026-03-01", valid_until_month: "2026-04-01" }, october),
      { valid_month: "2026-10-01", valid_until_month: "2026-11-01" },
    );
  });
});

describe("renameForPeriod", () => {
  it("swaps a whole run of months in the name", () => {
    assert.equal(
      renameForPeriod(
        "15 Days Umrah from Mumbai — November–December 2026",
        { valid_month: "2026-11-01", valid_until_month: "2026-12-01" },
        { valid_month: "2027-01-01", valid_until_month: "2027-02-01" },
      ),
      "15 Days Umrah from Mumbai — January–February 2027",
    );
  });
});

describe("compareNewestMonthFirst with runs", () => {
  it("keeps a November package and a November–December package apart", () => {
    const sorted = [
      { name: "nov-dec", valid_month: "2026-11-01", valid_until_month: "2026-12-01", starting_price: 0 },
      { name: "nov-a", valid_month: "2026-11-01", starting_price: 0 },
      { name: "nov-dec-2", valid_month: "2026-11-01", valid_until_month: "2026-12-01", starting_price: 0 },
      { name: "nov-b", valid_month: "2026-11-01", starting_price: 0 },
    ]
      .sort(compareNewestMonthFirst)
      .map((item) => item.name);
    assert.deepEqual(sorted, ["nov-a", "nov-b", "nov-dec", "nov-dec-2"]);
  });
});

describe("formatDepartureDates", () => {
  it("groups by month, sorts, and drops duplicates and junk", () => {
    assert.equal(
      formatDepartureDates(["2026-12-03", "2026-11-19", "2026-11-05", "2026-11-05", "soon"]),
      "5, 19 Nov · 3 Dec",
    );
  });

  it("does not merge the same month in two different years", () => {
    assert.equal(formatDepartureDates(["2026-11-05", "2027-11-04"]), "5 Nov · 4 Nov");
  });

  it("shows the earliest `limit` dates and counts the rest", () => {
    const dates = ["2026-12-07", "2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11", "2026-12-02"];
    assert.equal(formatDepartureDates(dates, { limit: 4 }), "2, 4, 9, 11 Nov + 2 more");
    assert.equal(formatDepartureDates(dates, { limit: 6 }), "2, 4, 9, 11 Nov · 2, 7 Dec");
    assert.equal(formatDepartureDates(dates, { limit: 0 }), "2, 4, 9, 11 Nov · 2, 7 Dec");
  });

  it("adds the year when asked, for a page with no period heading", () => {
    assert.equal(
      formatDepartureDates(["2027-02-01", "2027-01-30"], { withYear: true }),
      "30 Jan 2027 · 1 Feb 2027",
    );
  });

  it("is empty for none", () => {
    assert.equal(formatDepartureDates(undefined), "");
    assert.equal(formatDepartureDates([]), "");
  });
});

describe("flightCarrier", () => {
  it("joins airline and routing, and never assumes direct", () => {
    assert.equal(flightCarrier({ airline: "Saudia", flight_routing: "direct" }), "Saudia · Direct");
    assert.equal(flightCarrier({ airline: " Saudia ", flight_routing: "" }), "Saudia");
    assert.equal(flightCarrier({ flight_routing: "via", flight_via: "Muscat" }), "Via Muscat");
    assert.equal(flightCarrier({ flight_routing: "via" }), "Connecting");
    assert.equal(flightCarrier({}), "");
  });
});
