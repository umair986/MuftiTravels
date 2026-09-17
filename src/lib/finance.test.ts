/**
 * Tests for the money and invoice arithmetic.
 *
 * These two modules are the only place in the project where a bug is both
 * customer-facing and legally relevant, so they are the only place with tests.
 * Node's built-in runner, no framework: `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeInvoiceTotals,
  computeReceiptFigures,
  computeLineTotal,
  formatTaxRate,
  fyLabel,
  fyRange,
  resolveTaxMode,
} from "./finance";
import {
  formatPaise,
  formatRupees,
  formatRupeesCompact,
  numberToIndianWords,
  paiseToInputValue,
  paiseToWords,
  parsePaise,
  roundToRupee,
} from "./money";

const RUPEE = "₹";

describe("formatPaise", () => {
  it("groups in the Indian system, not in thousands", () => {
    assert.equal(formatPaise(12345678900), "12,34,56,789.00");
    assert.equal(formatPaise(100000000), "10,00,000.00");
    assert.equal(formatPaise(12345650), "1,23,456.50");
    assert.equal(formatPaise(99900), "999.00");
  });

  it("keeps two decimal places unless asked not to", () => {
    assert.equal(formatPaise(500000), "5,000.00");
    assert.equal(formatPaise(500000, { trimZeroPaise: true }), "5,000");
    // A trailing paise value is never trimmed, even when asked.
    assert.equal(formatPaise(500050, { trimZeroPaise: true }), "5,000.50");
  });

  it("handles zero and negatives", () => {
    assert.equal(formatPaise(0), "0.00");
    assert.equal(formatPaise(-12345), "-123.45");
    assert.equal(formatRupees(-12345), `-${RUPEE}123.45`);
  });
});

describe("formatRupees", () => {
  it("prefixes the rupee sign", () => {
    assert.equal(formatRupees(12345650), `${RUPEE}1,23,456.50`);
  });

  it("emits U+20B9 and not an ASCII substitute", () => {
    // The glyph is missing from the PDF core fonts, so src/lib/pdf/fonts.ts has
    // to register a face that carries it. Pinning the code point here means a
    // well-meaning swap to "Rs." shows up as a failing test rather than as a
    // silently different invoice.
    assert.equal(formatRupees(100).charCodeAt(0), 0x20b9);
  });
});

describe("formatRupeesCompact", () => {
  it("speaks in lakh and crore", () => {
    assert.equal(formatRupeesCompact(84000000), `${RUPEE}8.4L`); // ₹8,40,000
    assert.equal(formatRupeesCompact(2500000000), `${RUPEE}2.5Cr`); // ₹2,50,00,000
    assert.equal(formatRupeesCompact(250000000), `${RUPEE}25L`); // ₹25,00,000
    assert.equal(formatRupeesCompact(1500000), `${RUPEE}15K`); // ₹15,000
    assert.equal(formatRupeesCompact(45000), `${RUPEE}450`);
  });
});

describe("parsePaise", () => {
  it("reads what people actually type", () => {
    assert.equal(parsePaise("1,23,456.50"), 12345650);
    assert.equal(parsePaise(`${RUPEE} 123456`), 12345600);
    assert.equal(parsePaise("123456.5"), 12345650);
    assert.equal(parsePaise("0.05"), 5);
    assert.equal(parsePaise("  1000  "), 100000);
  });

  it("rejects what cannot be an amount", () => {
    assert.equal(parsePaise(""), null);
    assert.equal(parsePaise("abc"), null);
    assert.equal(parsePaise("-500"), null); // a refund is not a negative expense
    assert.equal(parsePaise("1.234"), null); // more precision than paise exist
    assert.equal(parsePaise("1e5"), null); // Excel's scientific notation
    assert.equal(parsePaise("99999999999999999"), null); // past MAX_PAISE
  });

  it("round-trips through paiseToInputValue", () => {
    for (const paise of [0, 5, 100, 12345650, 999999900]) {
      if (paise === 0) {
        assert.equal(paiseToInputValue(paise), "");
        continue;
      }
      assert.equal(parsePaise(paiseToInputValue(paise)), paise);
    }
  });

  it("does not drift on a value a float would mangle", () => {
    // 0.1 + 0.2 !== 0.3 is the whole reason this module exists.
    const a = parsePaise("0.10")!;
    const b = parsePaise("0.20")!;
    assert.equal(a + b, parsePaise("0.30"));
  });
});

describe("roundToRupee", () => {
  it("rounds half up and reports the adjustment", () => {
    assert.deepEqual(roundToRupee(10000), { total: 10000, roundOff: 0 });
    assert.deepEqual(roundToRupee(10049), { total: 10000, roundOff: -49 });
    assert.deepEqual(roundToRupee(10050), { total: 10100, roundOff: 50 });
    assert.deepEqual(roundToRupee(10099), { total: 10100, roundOff: 1 });
  });

  it("always lands on a whole rupee", () => {
    for (let paise = 99900; paise < 100100; paise += 7) {
      assert.equal(roundToRupee(paise).total % 100, 0);
    }
  });
});

describe("numberToIndianWords", () => {
  it("uses lakh and crore", () => {
    assert.equal(numberToIndianWords(0), "Zero");
    assert.equal(numberToIndianWords(7), "Seven");
    assert.equal(numberToIndianWords(15), "Fifteen");
    assert.equal(numberToIndianWords(40), "Forty");
    assert.equal(numberToIndianWords(123), "One Hundred Twenty Three");
    assert.equal(numberToIndianWords(1000), "One Thousand");
    assert.equal(numberToIndianWords(84000), "Eighty Four Thousand");
    assert.equal(numberToIndianWords(100000), "One Lakh");
    assert.equal(
      numberToIndianWords(123456),
      "One Lakh Twenty Three Thousand Four Hundred Fifty Six",
    );
    assert.equal(numberToIndianWords(10000000), "One Crore");
  });

  it("recurses past ninety-nine crore", () => {
    assert.equal(numberToIndianWords(1200000000), "One Hundred Twenty Crore");
  });
});

describe("paiseToWords", () => {
  it("writes the line printed under the total", () => {
    assert.equal(
      paiseToWords(12345650),
      "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only",
    );
  });

  it("omits the paise clause on a whole-rupee amount", () => {
    assert.equal(paiseToWords(8400000), "Rupees Eighty Four Thousand Only");
    assert.equal(paiseToWords(0), "Rupees Zero Only");
  });
});

describe("fyLabel", () => {
  it("starts the year on 1 April", () => {
    assert.equal(fyLabel("2026-08-31"), "26-27");
    assert.equal(fyLabel("2027-02-10"), "26-27");
    assert.equal(fyLabel("2027-03-31"), "26-27");
    assert.equal(fyLabel("2027-04-01"), "27-28");
    assert.equal(fyLabel("2026-03-31"), "25-26");
  });

  it("agrees with fyRange in both directions", () => {
    const { from, to } = fyRange("26-27");
    assert.equal(from, "2026-04-01");
    assert.equal(to, "2027-03-31");
    assert.equal(fyLabel(from), "26-27");
    assert.equal(fyLabel(to), "26-27");
  });
});

describe("computeLineTotal", () => {
  it("multiplies without floating point drift", () => {
    assert.equal(computeLineTotal(1, 8400000), 8400000);
    assert.equal(computeLineTotal(3, 8400000), 25200000);
    // 2.4 x 1000.10 is 2400.24 — the case a naive float multiply gets wrong.
    assert.equal(computeLineTotal(2.4, 100010), 240024);
    assert.equal(computeLineTotal(0.5, 12345), 6173); // half a paise rounds up
  });
});

describe("computeInvoiceTotals", () => {
  const items = [
    { quantity: 3, unitPricePaise: 8400000 }, // 3 x ₹84,000 = ₹2,52,000
    { quantity: 1, unitPricePaise: 1500000 }, // 1 x ₹15,000
  ];

  it("sums line items with no discount and no tax", () => {
    const totals = computeInvoiceTotals({
      items,
      discountPaise: 0,
      taxMode: "none",
      taxRateBp: 0,
    });
    assert.equal(totals.subtotalPaise, 26700000);
    assert.equal(totals.taxablePaise, 26700000);
    assert.equal(totals.cgstPaise, 0);
    assert.equal(totals.sgstPaise, 0);
    assert.equal(totals.igstPaise, 0);
    assert.equal(totals.totalPaise, 26700000);
  });

  it("ignores the rate when the mode is none", () => {
    const totals = computeInvoiceTotals({
      items,
      discountPaise: 0,
      taxMode: "none",
      taxRateBp: 1800,
    });
    assert.equal(totals.totalPaise, totals.taxablePaise);
  });

  it("takes the discount off before tax", () => {
    const totals = computeInvoiceTotals({
      items,
      discountPaise: 700000, // ₹7,000
      taxMode: "igst",
      taxRateBp: 500,
    });
    assert.equal(totals.taxablePaise, 26000000);
    assert.equal(totals.igstPaise, 1300000); // 5% of ₹2,60,000 = ₹13,000
    assert.equal(totals.totalPaise, 27300000);
  });

  it("clamps a discount larger than the bill instead of going negative", () => {
    const totals = computeInvoiceTotals({
      items,
      discountPaise: 99999999,
      taxMode: "igst",
      taxRateBp: 1800,
    });
    assert.equal(totals.discountPaise, 26700000);
    assert.equal(totals.taxablePaise, 0);
    assert.equal(totals.totalPaise, 0);
  });

  it("clamps a negative discount to zero", () => {
    const totals = computeInvoiceTotals({
      items,
      discountPaise: -5000,
      taxMode: "none",
      taxRateBp: 0,
    });
    assert.equal(totals.discountPaise, 0);
    assert.equal(totals.totalPaise, 26700000);
  });

  it("splits CGST and SGST at half the rate each, not by halving the total", () => {
    // ₹1,001.01 at 5% is ₹50.0505 of tax. Halving that total would leave an
    // orphan paise; computing each side at 2.5% gives ₹25.03 twice.
    const totals = computeInvoiceTotals({
      items: [{ quantity: 1, unitPricePaise: 100101 }],
      discountPaise: 0,
      taxMode: "cgst_sgst",
      taxRateBp: 500,
    });
    assert.equal(totals.cgstPaise, totals.sgstPaise);
    assert.equal(totals.cgstPaise, 2503);
    assert.equal(totals.igstPaise, 0);
  });

  it("charges IGST as a single line", () => {
    const totals = computeInvoiceTotals({
      items: [{ quantity: 1, unitPricePaise: 10000000 }],
      discountPaise: 0,
      taxMode: "igst",
      taxRateBp: 1800,
    });
    assert.equal(totals.igstPaise, 1800000);
    assert.equal(totals.cgstPaise, 0);
    assert.equal(totals.sgstPaise, 0);
  });

  it("rounds the payable to a whole rupee and records the adjustment", () => {
    const totals = computeInvoiceTotals({
      items: [{ quantity: 1, unitPricePaise: 100101 }],
      discountPaise: 0,
      taxMode: "igst",
      taxRateBp: 500,
    });
    // ₹1,001.01 + ₹50.05 = ₹1,051.06, rounds down to ₹1,051.
    assert.equal(totals.roundOffPaise, -6);
    assert.equal(totals.totalPaise, 105100);
    assert.equal(totals.totalPaise % 100, 0);
  });

  it("produces a negative round-off when rounding down", () => {
    const totals = computeInvoiceTotals({
      items: [{ quantity: 1, unitPricePaise: 100040 }],
      discountPaise: 0,
      taxMode: "none",
      taxRateBp: 0,
    });
    assert.equal(totals.roundOffPaise, -40);
    assert.equal(totals.totalPaise, 100000);
  });

  it("holds the identity the database CHECK constraint enforces", () => {
    // total = taxable + cgst + sgst + igst + roundOff, for every combination.
    const modes = ["none", "cgst_sgst", "igst"] as const;
    const rates = [0, 500, 1200, 1800];
    const prices = [1, 99, 100101, 8400000, 33333333];

    for (const taxMode of modes) {
      for (const taxRateBp of rates) {
        for (const unitPricePaise of prices) {
          for (const discountPaise of [0, 1, 12345]) {
            const t = computeInvoiceTotals({
              items: [{ quantity: 1.5, unitPricePaise }],
              discountPaise,
              taxMode,
              taxRateBp,
            });
            assert.equal(
              t.totalPaise,
              t.taxablePaise +
                t.cgstPaise +
                t.sgstPaise +
                t.igstPaise +
                t.roundOffPaise,
              `identity broken for ${taxMode} ${taxRateBp} ${unitPricePaise} ${discountPaise}`,
            );
            assert.ok(t.taxablePaise >= 0);
            assert.equal(t.totalPaise % 100, 0);
          }
        }
      }
    }
  });

  it("handles an empty invoice without producing NaN", () => {
    const totals = computeInvoiceTotals({
      items: [],
      discountPaise: 0,
      taxMode: "igst",
      taxRateBp: 1800,
    });
    assert.equal(totals.subtotalPaise, 0);
    assert.equal(totals.totalPaise, 0);
  });

  it("stays exact across a long line list", () => {
    // 300 lines at ₹0.10 is ₹30.00 exactly. In rupee floats it is not.
    const totals = computeInvoiceTotals({
      items: Array.from({ length: 300 }, () => ({
        quantity: 1,
        unitPricePaise: 10,
      })),
      discountPaise: 0,
      taxMode: "none",
      taxRateBp: 0,
    });
    assert.equal(totals.subtotalPaise, 3000);
  });
});

describe("resolveTaxMode", () => {
  it("picks the split from the two state codes", () => {
    assert.equal(resolveTaxMode("27", "27", true), "cgst_sgst");
    assert.equal(resolveTaxMode("27", "09", true), "igst");
  });

  it("falls back to none rather than guessing", () => {
    assert.equal(resolveTaxMode("27", "27", false), "none");
    assert.equal(resolveTaxMode("27", "", true), "none");
    assert.equal(resolveTaxMode("", "27", true), "none");
  });
});

describe("formatTaxRate", () => {
  it("reads as a percentage", () => {
    assert.equal(formatTaxRate(500), "5%");
    assert.equal(formatTaxRate(1800), "18%");
    assert.equal(formatTaxRate(250), "2.5%");
    assert.equal(formatTaxRate(0), "0%");
  });
});

describe("computeReceiptFigures", () => {
  it("first payment: due before is the whole invoice", () => {
    assert.deepEqual(computeReceiptFigures(9000000, 0, 5000000), {
      dueBeforePaise: 9000000,
      receivedPaise: 5000000,
      dueAfterPaise: 4000000,
    });
  });

  it("second payment starts from what the first one left", () => {
    assert.deepEqual(computeReceiptFigures(9000000, 5000000, 4000000), {
      dueBeforePaise: 4000000,
      receivedPaise: 4000000,
      dueAfterPaise: 0,
    });
  });

  it("an overpayment leaves a negative balance rather than hiding it", () => {
    assert.equal(computeReceiptFigures(9000000, 5000000, 4000100).dueAfterPaise, -100);
  });
});
