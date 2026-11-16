import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { daysUntil, formatShortDate, toDateInput } from "@/lib/dates";

describe("dates", () => {
  it("toDateInput is the local calendar day", () => {
    assert.equal(toDateInput(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
  });

  it("formatShortDate handles blanks, junk, dates and timestamps", () => {
    assert.equal(formatShortDate(null), "—");
    assert.equal(formatShortDate("", ""), "");
    assert.equal(formatShortDate("not a date"), "not a date");
    assert.match(formatShortDate("2026-11-05"), /5 Nov 2026/);
    assert.match(formatShortDate("2026-11-05T10:00:00Z"), /Nov 2026/);
  });

  it("daysUntil counts whole days from the start of today", () => {
    const today = new Date(2026, 10, 16, 18, 0);
    assert.equal(daysUntil("2026-11-16", today), 0);
    assert.equal(daysUntil("2026-11-20", today), 4);
    assert.equal(daysUntil("2026-11-15", today), -1);
    assert.equal(daysUntil(null, today), null);
  });
});
