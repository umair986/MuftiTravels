/**
 * Tests for the flight paste reader and the helpers that print its result.
 *
 * The block below is verbatim what the business is sent, and a wrong departure
 * time or year read out of it reaches a customer's document, so it is pinned
 * exactly. Node's built-in runner: `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  baggageLines,
  cleanBaggage,
  cleanFlights,
  flightRoute,
  flightTimes,
  formatLegDate,
  inferLegDate,
  parseBaggageText,
  parseFlightPaste,
  parseFlightText,
} from "./flights";

const PASTED = `Saudi Airline
SV 771  BOM-JED 26Dec 11:00 - 14:15
SV 770 JED - BOM 09Jan 2:10 - 09:25
Check in Baggage 20Kg x 2pc . Cabin Bag  07Kg x 1pc`;

/** Pasted in October 2026, as it would be for a December departure. */
const TODAY = "2026-10-20";

describe("parseFlightPaste", () => {
  it("reads the block as the agent sends it", () => {
    const { legs, baggage } = parseFlightPaste(PASTED, TODAY);
    assert.deepEqual(legs, [
      {
        airline: "Saudi Airline",
        flight_no: "SV 771",
        from: "BOM",
        to: "JED",
        date: "2026-12-26",
        departs: "11:00",
        arrives: "14:15",
      },
      {
        airline: "Saudi Airline",
        flight_no: "SV 770",
        from: "JED",
        to: "BOM",
        // January AFTER the December outbound: next year, not this one.
        date: "2027-01-09",
        departs: "02:10",
        arrives: "09:25",
      },
    ]);
    assert.deepEqual(baggage, {
      checkin_kg: 20,
      checkin_pieces: 2,
      cabin_kg: 7,
      cabin_pieces: 1,
    });
  });

  it("does not take the baggage line for an airline", () => {
    const legs = parseFlightText(
      "Saudi Airline\nCheck in Baggage 20Kg x 2pc\nSV 771 BOM-JED 26Dec 11:00 - 14:15",
      TODAY,
    );
    assert.equal(legs[0].airline, "Saudi Airline");
  });

  it("applies a second carrier from where it is named", () => {
    const legs = parseFlightText(
      "IndiGo\n6E 61 BOM-JED 26 Dec 04:30\nSaudia\nSV770 JED to BOM 09 Jan 14:00 - 20:10",
      TODAY,
    );
    assert.equal(legs[0].airline, "IndiGo");
    assert.equal(legs[0].flight_no, "6E 61");
    assert.equal(legs[0].date, "2026-12-26");
    assert.equal(legs[0].arrives, "");
    assert.equal(legs[1].airline, "Saudia");
    assert.equal(legs[1].flight_no, "SV 770");
    assert.equal(legs[1].to, "BOM");
  });

  it("keeps AM/PM and does not read a dotted date as a time", () => {
    const [leg] = parseFlightText("SV 771 BOM-JED 26.12.2026 11:00 am - 2:15 pm", TODAY);
    assert.equal(leg.date, "2026-12-26");
    assert.equal(leg.departs, "11:00 AM");
    assert.equal(leg.arrives, "02:15 PM");
  });

  it("keeps a date it cannot read as the text it was", () => {
    const [leg] = parseFlightText("SV 771 BOM-JED Saturday 11:00", TODAY);
    assert.equal(leg.date, "Saturday");
  });

  it("returns nothing for text with no flight in it", () => {
    const empty = parseFlightPaste("Tickets to be confirmed next week", TODAY);
    assert.deepEqual(empty.legs, []);
    assert.equal(empty.baggage.checkin_kg, null);
    assert.deepEqual(parseFlightText("", TODAY), []);
  });
});

describe("inferLegDate", () => {
  it("takes the next occurrence on or after the floor", () => {
    assert.equal(inferLegDate("26Dec", "2026-10-20"), "2026-12-26");
    assert.equal(inferLegDate("15 Mar", "2026-10-20"), "2027-03-15");
    assert.equal(inferLegDate("20 Oct", "2026-10-20"), "2026-10-20");
  });

  it("uses a stated year as given", () => {
    assert.equal(inferLegDate("26-Dec-26", "2030-01-01"), "2026-12-26");
    assert.equal(inferLegDate("26 December 2026", "2030-01-01"), "2026-12-26");
    assert.equal(inferLegDate("09/01/2027", "2026-10-20"), "2027-01-09");
  });

  it("rejects what is not a date", () => {
    assert.equal(inferLegDate("31 Feb", "2026-10-20"), "");
    assert.equal(inferLegDate("26 Foo", "2026-10-20"), "");
    assert.equal(inferLegDate("", "2026-10-20"), "");
  });

  it("finds the next 29 February rather than inventing one", () => {
    assert.equal(inferLegDate("29 Feb", "2026-10-20"), "2028-02-29");
  });
});

describe("formatLegDate", () => {
  it("prints a calendar date the same way on every device", () => {
    assert.equal(formatLegDate("2026-12-26"), "26 Dec 2026");
    assert.equal(formatLegDate("2027-01-09"), "09 Jan 2027");
  });

  it("prints anything else exactly as typed", () => {
    assert.equal(formatLegDate("26Dec"), "26Dec");
    assert.equal(formatLegDate(""), "");
  });
});

describe("baggage", () => {
  it("reads a line with only a check-in allowance", () => {
    assert.deepEqual(parseBaggageText("Baggage 30 kgs"), {
      checkin_kg: 30,
      checkin_pieces: null,
      cabin_kg: null,
      cabin_pieces: null,
    });
  });

  it("prints only what was stated", () => {
    assert.deepEqual(
      baggageLines({ checkin_kg: 20, checkin_pieces: 2, cabin_kg: 7, cabin_pieces: 1 }),
      ["Check-in 20 kg × 2 pc", "Cabin 7 kg × 1 pc"],
    );
    assert.deepEqual(
      baggageLines({ checkin_kg: 30, checkin_pieces: null, cabin_kg: null, cabin_pieces: null }),
      ["Check-in 30 kg"],
    );
    assert.deepEqual(baggageLines(cleanBaggage(undefined)), []);
  });

  it("treats a pre-031 row's missing column as nothing stated", () => {
    assert.deepEqual(cleanBaggage(undefined), cleanBaggage({}));
    assert.equal(cleanBaggage({ checkin_kg: "0" }).checkin_kg, null);
  });
});

describe("cleanFlights", () => {
  it("treats a pre-031 row's missing column as no flights", () => {
    assert.deepEqual(cleanFlights(undefined), []);
    assert.deepEqual(cleanFlights(null), []);
  });

  it("drops empty legs and upper-cases airports", () => {
    const legs = cleanFlights([
      { airline: "Saudia", flight_no: "", from: "", to: "", date: "", departs: "", arrives: "" },
      { airline: "", flight_no: "SV 771", from: "bom", to: "jed" },
    ]);
    assert.equal(legs.length, 1);
    assert.equal(legs[0].from, "BOM");
    assert.equal(legs[0].date, "");
  });
});

describe("flightRoute / flightTimes", () => {
  it("joins what is there and skips what is not", () => {
    assert.equal(flightRoute({ from: "BOM", to: "JED" }), "BOM - JED");
    assert.equal(flightRoute({ from: "BOM" }), "BOM");
    assert.equal(flightTimes({ departs: "11:00", arrives: "" }), "11:00");
  });
});
