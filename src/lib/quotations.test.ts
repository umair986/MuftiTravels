/**
 * Tests for the quotation arithmetic.
 *
 * Same reasoning as finance.test.ts: a quotation is the first number a customer
 * ever sees from this business, and getting it wrong is both visible and
 * expensive — an offer sent at the wrong price is one we are expected to honour.
 * Node's built-in runner, no framework: `npm test`.
 *
 * The scenario that prompted the whole feature is pinned at the bottom, end to
 * end, so that a refactor which quietly changes it fails here.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeInvoiceTotals } from "./finance";
import { MAX_PAISE, parsePaise, paiseToInputValue, rupeesToPaise } from "./money";
import {
  defaultPax,
  durationLabel,
  inferDurationDays,
  isExpired,
  parseDescriptionLines,
  paxFromBreakdown,
  perPersonPaise,
  quotationDisplayStatus,
  quotationFileName,
  quotationPdfPath,
  resolveQuoteDiscount,
  totalTravellers,
  travellerSummary,
  whatsappQuoteUrl,
} from "./quotations";

/** ₹1,10,000 per person — the Silver rate in the scenario. */
const SILVER_PAISE = 11_000_000;

describe("rupeesToPaise", () => {
  it("converts the catalogue's rupee numbers exactly", () => {
    assert.equal(rupeesToPaise(110000), 11_000_000);
    assert.equal(rupeesToPaise(74786), 7_478_600);
    assert.equal(rupeesToPaise(0), 0);
  });

  it("keeps a paise fraction that binary floating point would lose", () => {
    assert.equal(rupeesToPaise(74786.5), 7_478_650);
    // 1234.56 * 100 is 123455.99999999999 in IEEE 754. The point of routing
    // through parsePaise is that this comes out whole anyway.
    assert.equal(rupeesToPaise(1234.56), 123_456);
  });

  it("round-trips through the input helpers", () => {
    const paise = rupeesToPaise(110000);
    assert.equal(parsePaise(paiseToInputValue(paise)), paise);
  });

  it("returns zero for what cannot be a price", () => {
    assert.equal(rupeesToPaise(Number.NaN), 0);
    assert.equal(rupeesToPaise(Number.POSITIVE_INFINITY), 0);
    assert.equal(rupeesToPaise(-5000), 0); // a negative rate is a data error
    assert.equal(rupeesToPaise(MAX_PAISE), 0); // ₹10,000 crore of rupees is a typo
    // A tier with no rate for a sharing type is a gap the admin types over.
    assert.equal(rupeesToPaise(undefined as unknown as number), 0);
  });
});

describe("resolveQuoteDiscount", () => {
  it("takes a percentage off the whole quote", () => {
    // Ten people at ₹1,10,000 is ₹11,00,000; five percent of that is ₹55,000.
    assert.equal(resolveQuoteDiscount(110_000_000, "percent", 500, 0), 5_500_000);
    assert.equal(resolveQuoteDiscount(110_000_000, "percent", 1000, 0), 11_000_000);
    // 2.5% — the same basis-point scale tax_rate_bp uses.
    assert.equal(resolveQuoteDiscount(110_000_000, "percent", 250, 0), 2_750_000);
  });

  it("passes a flat amount through", () => {
    assert.equal(resolveQuoteDiscount(110_000_000, "amount", 0, 5_000_000), 5_000_000);
  });

  it("ignores the other field in each mode", () => {
    // A mode switch must not leave the previous mode's number in the total.
    assert.equal(resolveQuoteDiscount(110_000_000, "amount", 500, 100_000), 100_000);
    assert.equal(resolveQuoteDiscount(110_000_000, "percent", 500, 999_999), 5_500_000);
    assert.equal(resolveQuoteDiscount(110_000_000, "none", 500, 999_999), 0);
  });

  it("clamps a discount larger than the bill", () => {
    // A typo, not a credit note. Never negative, never above the subtotal.
    assert.equal(resolveQuoteDiscount(100_000, "amount", 0, 500_000), 100_000);
    assert.equal(resolveQuoteDiscount(100_000, "amount", 0, -500_000), 0);
    assert.equal(resolveQuoteDiscount(100_000, "percent", 10000, 0), 100_000);
    assert.equal(resolveQuoteDiscount(100_000, "percent", 20000, 0), 100_000);
  });

  it("is zero on an empty bill, whatever the mode says", () => {
    assert.equal(resolveQuoteDiscount(0, "percent", 500, 0), 0);
    assert.equal(resolveQuoteDiscount(0, "amount", 0, 500_000), 0);
  });

  it("produces a discount computeInvoiceTotals still balances", () => {
    // The clamp has to leave the database's CHECK satisfiable, or an over-typed
    // discount fails the insert instead of being quietly corrected.
    const subtotal = 100_000;
    const discountPaise = resolveQuoteDiscount(subtotal, "amount", 0, 500_000);
    const totals = computeInvoiceTotals({
      items: [{ quantity: 1, unitPricePaise: subtotal }],
      discountPaise,
      taxMode: "igst",
      taxRateBp: 500,
    });
    assert.equal(
      totals.totalPaise,
      totals.taxablePaise +
        totals.cgstPaise +
        totals.sgstPaise +
        totals.igstPaise +
        totals.roundOffPaise,
    );
    assert.equal(totals.taxablePaise, 0);
  });
});

describe("perPersonPaise", () => {
  it("divides the total by the head count", () => {
    assert.equal(perPersonPaise(104_500_000, 10), 10_450_000);
    assert.equal(perPersonPaise(SILVER_PAISE, 1), SILVER_PAISE);
  });

  it("floors rather than inventing a rupee", () => {
    // ₹1,000 across 3 people is ₹333.33 and a third. Printed with "≈".
    assert.equal(perPersonPaise(100_000, 3), 33_333);
  });

  it("is null when there is no usable head count", () => {
    assert.equal(perPersonPaise(104_500_000, null), null);
    assert.equal(perPersonPaise(104_500_000, 0), null);
    assert.equal(perPersonPaise(104_500_000, -4), null);
    assert.equal(perPersonPaise(104_500_000, Number.NaN), null);
  });
});

describe("defaultPax", () => {
  it("sums the line quantities", () => {
    // Six on quad plus four on triple is ten people.
    assert.equal(defaultPax([{ quantity: 6 }, { quantity: 4 }]), 10);
    assert.equal(defaultPax([{ quantity: 1 }]), 1);
  });

  it("rounds, because a head count has no decimals", () => {
    assert.equal(defaultPax([{ quantity: 2.5 }, { quantity: 1.5 }]), 4);
  });

  it("is null when there is nothing to count", () => {
    assert.equal(defaultPax([]), null);
    assert.equal(defaultPax([{ quantity: 0 }]), null);
    assert.equal(defaultPax([{ quantity: Number.NaN }]), null);
  });
});

describe("isExpired", () => {
  const today = new Date("2026-10-10T09:00:00");

  it("expires a sent offer the day after its last valid day", () => {
    assert.equal(isExpired("sent", "2026-10-09", today), true);
  });

  it("treats the last valid day as still valid", () => {
    // "Valid until 10 Oct" means the customer may accept on the 10th.
    assert.equal(isExpired("sent", "2026-10-10", today), false);
    assert.equal(isExpired("sent", "2026-10-11", today), false);
  });

  it("never expires anything that is not a live offer", () => {
    // A draft was never promised; the other two have had their answer.
    assert.equal(isExpired("draft", "2020-01-01", today), false);
    assert.equal(isExpired("accepted", "2020-01-01", today), false);
    assert.equal(isExpired("declined", "2020-01-01", today), false);
  });

  it("does not expire a quotation with no expiry", () => {
    assert.equal(isExpired("sent", null, today), false);
  });

  it("compares dates as dates, not as timestamps", () => {
    // Late in the evening of the last valid day is still the last valid day —
    // the bug a Date.getTime() comparison against midnight would introduce.
    assert.equal(isExpired("sent", "2026-10-10", new Date("2026-10-10T23:59:00")), false);
  });
});

describe("quotationDisplayStatus", () => {
  it("shows expired in place of sent, and nothing else", () => {
    assert.equal(quotationDisplayStatus("sent", true), "expired");
    assert.equal(quotationDisplayStatus("sent", false), "sent");
    // The view only ever flags a sent row, but a stale flag must not relabel an
    // accepted quotation as expired.
    assert.equal(quotationDisplayStatus("accepted", true), "accepted");
    assert.equal(quotationDisplayStatus("draft", true), "draft");
  });
});

describe("quotationPdfPath", () => {
  it("flattens the slashes storage would read as folders", () => {
    assert.equal(
      quotationPdfPath("abc-123", "MTQ/26-27/0001", 1),
      "abc-123/MTQ-26-27-0001-r1.pdf",
    );
  });

  it("gives every revision its own object", () => {
    // The whole of "a sent quotation stays editable": revision 2 is written
    // beside revision 1, so the link the customer holds still opens what they
    // were sent.
    const first = quotationPdfPath("abc-123", "MTQ/26-27/0001", 1);
    const second = quotationPdfPath("abc-123", "MTQ/26-27/0001", 2);
    assert.notEqual(first, second);
    assert.equal(second, "abc-123/MTQ-26-27-0001-r2.pdf");
  });

  it("never produces a revision below one", () => {
    assert.equal(
      quotationPdfPath("abc-123", "MTQ/26-27/0001", 0),
      "abc-123/MTQ-26-27-0001-r1.pdf",
    );
  });
});

describe("quotationFileName", () => {
  it("names the revision only past the first", () => {
    assert.equal(
      quotationFileName({ id: "abc", number: "MTQ/26-27/0001", revision: 1 }),
      "quotation-MTQ-26-27-0001.pdf",
    );
    assert.equal(
      quotationFileName({ id: "abc", number: "MTQ/26-27/0001", revision: 2 }),
      "quotation-MTQ-26-27-0001-r2.pdf",
    );
  });

  it("falls back to the row id for an unsent draft", () => {
    assert.equal(
      quotationFileName({ id: "abc", number: null, revision: 1 }),
      "quotation-abc.pdf",
    );
  });
});

describe("whatsappQuoteUrl", () => {
  const base = {
    name: "Imran",
    number: "MTQ/26-27/0001",
    totalPaise: 104_500_000,
    link: "https://example.test/signed",
  };

  it("assumes a bare ten-digit number is Indian", () => {
    const url = whatsappQuoteUrl({ ...base, phone: "9323063712" });
    assert.ok(url?.startsWith("https://wa.me/919323063712?text="));
  });

  it("leaves a number that already carries a country code alone", () => {
    const url = whatsappQuoteUrl({ ...base, phone: "+91 93230 63712" });
    assert.ok(url?.startsWith("https://wa.me/919323063712?text="));
  });

  it("refuses a number too short to be one", () => {
    assert.equal(whatsappQuoteUrl({ ...base, phone: "93230" }), null);
    assert.equal(whatsappQuoteUrl({ ...base, phone: "" }), null);
  });

  it("leads with the per-person figure when there is a group", () => {
    const url = whatsappQuoteUrl({
      ...base,
      phone: "9323063712",
      perPersonPaise: 10_450_000,
      pax: 10,
    });
    const text = decodeURIComponent(url!.split("?text=")[1]);
    assert.match(text, /10,45,000/); // the total
    assert.match(text, /1,04,500 per person/); // the number being negotiated
    assert.match(text, /MTQ\/26-27\/0001/);
  });

  it("omits the per-person line for a single traveller", () => {
    const url = whatsappQuoteUrl({
      ...base,
      phone: "9323063712",
      perPersonPaise: 104_500_000,
      pax: 1,
    });
    const text = decodeURIComponent(url!.split("?text=")[1]);
    assert.doesNotMatch(text, /per person/);
  });

  it("states the validity date when there is one", () => {
    const withDate = whatsappQuoteUrl({
      ...base,
      phone: "9323063712",
      validUntil: "2026-10-10",
    });
    assert.match(
      decodeURIComponent(withDate!.split("?text=")[1]),
      /valid until 10 Oct 2026/,
    );

    const withoutDate = whatsappQuoteUrl({ ...base, phone: "9323063712" });
    assert.doesNotMatch(
      decodeURIComponent(withoutDate!.split("?text=")[1]),
      /valid until/,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Trip details (migration 025)                                               */
/* -------------------------------------------------------------------------- */

describe("durationLabel", () => {
  it("prints the shorthand every Umrah quotation carries", () => {
    assert.equal(durationLabel(15), "15D/14N");
    assert.equal(durationLabel(7), "7D/6N");
  });

  it("does not claim zero nights on a one-day trip", () => {
    // "1D/0N" reads as a trip with something missing from it.
    assert.equal(durationLabel(1), "1D");
  });

  it("says nothing when the duration is unknown", () => {
    // Empty, not a dash: the caller drops the whole line rather than printing
    // a label with nothing after it.
    assert.equal(durationLabel(null), "");
    assert.equal(durationLabel(undefined), "");
    assert.equal(durationLabel(0), "");
    assert.equal(durationLabel(-3), "");
  });
});

describe("inferDurationDays", () => {
  it("counts both ends, the way a brochure does", () => {
    // Out on the 3rd, back on the 17th, is a fifteen-day trip.
    assert.equal(inferDurationDays("2026-12-03", "2026-12-17"), 15);
    assert.equal(inferDurationDays("2026-12-03", "2026-12-03"), 1);
  });

  it("survives a month and a year boundary", () => {
    assert.equal(inferDurationDays("2026-12-28", "2027-01-03"), 7);
  });

  it("gives up rather than guessing", () => {
    assert.equal(inferDurationDays(null, "2026-12-17"), null);
    assert.equal(inferDurationDays("2026-12-03", null), null);
    assert.equal(inferDurationDays("not a date", "2026-12-17"), null);
    // Backwards: the database rejects this pair anyway.
    assert.equal(inferDurationDays("2026-12-17", "2026-12-03"), null);
  });
});

describe("travellerSummary", () => {
  it("returns all four counts, zeros included", () => {
    // "0 infants" is an answer the customer gave; a blank is a question never
    // asked, and on a document quoting a price per bed that is the price.
    const rows = travellerSummary({ adults: 10, infants: 0 });
    assert.deepEqual(
      rows.map((row) => [row.label, row.count]),
      [
        ["Adults", 10],
        ["Child (bed)", 0],
        ["Child (no bed)", 0],
        ["Infants", 0],
      ],
    );
  });

  it("reads a missing or nonsense count as nobody", () => {
    const rows = travellerSummary({
      adults: null,
      children_with_bed: undefined,
      children_without_bed: -4,
      infants: Number.NaN,
    });
    assert.deepEqual(rows.map((row) => row.count), [0, 0, 0, 0]);
  });
});

describe("totalTravellers", () => {
  it("counts everybody, infants included", () => {
    assert.equal(
      totalTravellers({
        adults: 10,
        children_with_bed: 2,
        children_without_bed: 1,
        infants: 1,
      }),
      14,
    );
  });

  it("is zero when the breakdown was never filled in", () => {
    // Which is how the renderer decides not to draw the block at all.
    assert.equal(totalTravellers({}), 0);
  });
});

describe("paxFromBreakdown", () => {
  it("leaves infants out", () => {
    // An infant occupies no bed. Counting one would divide the total by a
    // person it was not priced for and understate the per-person figure.
    assert.equal(
      paxFromBreakdown({
        adults: 10,
        children_with_bed: 2,
        children_without_bed: 1,
      }),
      13,
    );
  });

  it("is null when there is nobody to divide by", () => {
    assert.equal(paxFromBreakdown({ infants: 2 } as never), null);
    assert.equal(paxFromBreakdown({}), null);
  });

  it("agrees with perPersonPaise on the scenario", () => {
    const pax = paxFromBreakdown({ adults: 10 });
    assert.equal(pax, 10);
    assert.equal(perPersonPaise(104_500_000, pax), 10_450_000);
  });
});

describe("parseDescriptionLines", () => {
  it("reads the first line as the item and indents the rest", () => {
    const lines = parseDescriptionLines(
      [
        "Royal Package",
        "Quint Room - Private",
        "  Makkah Hotel",
        "    Makkah Tower",
      ].join("\n"),
    );

    assert.deepEqual(lines, [
      { text: "Royal Package", depth: 0, bold: false },
      { text: "Quint Room - Private", depth: 0, bold: false },
      { text: "Makkah Hotel", depth: 1, bold: false },
      { text: "Makkah Tower", depth: 2, bold: false },
    ]);
  });

  it("counts a tab as four spaces", () => {
    const lines = parseDescriptionLines("Item\n\tHotel");
    assert.equal(lines[0].text, "Item");
    assert.deepEqual(lines[1], { text: "Hotel", depth: 2, bold: false });
  });

  it("caps the depth so a pasted block cannot run off the cell", () => {
    const [, deep] = parseDescriptionLines("Item\n" + " ".repeat(40) + "Lost");
    assert.equal(deep.depth, 3);
  });

  it("takes **asterisks** as a sub-heading and strips them", () => {
    const [, heading] = parseDescriptionLines("Item\n**Inclusions**");
    assert.deepEqual(heading, { text: "Inclusions", depth: 0, bold: true });
  });

  it("drops blank lines rather than drawing them", () => {
    // They arrive from pasted text far more often than they are meant, and a
    // cell that grows three empty rows is how a bill spills onto a second page.
    const lines = parseDescriptionLines("Item\n\n   \n  Hotel\n\n");
    assert.deepEqual(
      lines.map((line) => line.text),
      ["Item", "Hotel"],
    );
  });

  it("reads a Windows line ending the same as a Unix one", () => {
    // Pasted from Word, which is where these itineraries come from today.
    const lines = parseDescriptionLines("Item\r\n  Hotel");
    assert.deepEqual(
      lines.map((line) => [line.text, line.depth]),
      [
        ["Item", 0],
        ["Hotel", 1],
      ],
    );
  });

  it("handles an empty description without throwing", () => {
    assert.deepEqual(parseDescriptionLines(""), []);
    assert.deepEqual(parseDescriptionLines(undefined as never), []);
  });

  it("leaves a plain one-line description exactly as it was", () => {
    // The shape every quotation written before 025 is in.
    assert.deepEqual(parseDescriptionLines("15 Days Regular Umrah · Silver"), [
      { text: "15 Days Regular Umrah · Silver", depth: 0, bold: false },
    ]);
  });
});

describe("the scenario this feature was built for", () => {
  it("quotes ten people on Silver at 5% off", () => {
    // "Silver package from Mumbai, we are ten people, give us a discount."
    // The rate comes off the website as a rupee number; everything after it is
    // paise.
    const ratePaise = rupeesToPaise(110000);
    assert.equal(ratePaise, SILVER_PAISE);

    const items = [{ quantity: 10, unitPricePaise: ratePaise }];
    const subtotalPaise = 10 * ratePaise;

    const discountPaise = resolveQuoteDiscount(subtotalPaise, "percent", 500, 0);

    const totals = computeInvoiceTotals({
      items,
      discountPaise,
      taxMode: "none", // GST is off until the CA has signed off on the rate
      taxRateBp: 0,
    });

    assert.equal(totals.subtotalPaise, 110_000_000); // ₹11,00,000
    assert.equal(totals.discountPaise, 5_500_000); //  ₹55,000 off
    assert.equal(totals.totalPaise, 104_500_000); //   ₹10,45,000
    assert.equal(perPersonPaise(totals.totalPaise, 10), 10_450_000); // ₹1,04,500

    // And the head count the editor would have prefilled is the one we quoted.
    assert.equal(defaultPax(items.map((item) => ({ quantity: item.quantity }))), 10);
  });
});
