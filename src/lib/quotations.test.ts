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
  isExpired,
  perPersonPaise,
  quotationDisplayStatus,
  quotationFileName,
  quotationPdfPath,
  resolveQuoteDiscount,
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
