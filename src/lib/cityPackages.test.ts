/**
 * Tests for splitting a category page's packages by departure city.
 * Node's built-in runner: `npm test`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { groupByCity } from "./cityPackages";
import type { CmsPackageRecord } from "./packages";

const pkg = (slug: string, departure_city?: string) =>
  ({ slug, departure_city }) as CmsPackageRecord;

test("groupByCity: site city order, no-city last, input order kept", () => {
  const groups = groupByCity([
    pkg("delhi-a", "delhi"),
    pkg("land", ""),
    pkg("mumbai-b", "mumbai"),
    pkg("mumbai-a", "mumbai"),
    pkg("old", "pune"),
  ]);
  assert.deepEqual(
    groups.map((group) => [group.city, group.packages.map((item) => item.slug)]),
    [
      ["mumbai", ["mumbai-b", "mumbai-a"]],
      ["delhi", ["delhi-a"]],
      ["", ["land", "old"]],
    ],
  );
});

test("groupByCity: empty in, nothing out", () => {
  assert.deepEqual(groupByCity([]), []);
});
