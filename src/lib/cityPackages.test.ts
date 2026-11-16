/**
 * Tests for splitting a category page's packages by departure city.
 * Node's built-in runner: `npm test`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { groupByCity, matchPackages, readCatalogFilter } from "./cityPackages";
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

test("matchPackages: by category and departure city; an unknown city narrows nothing", () => {
  const all = [
    { ...pkg("mumbai-umrah", "mumbai"), category: "Umrah Fixed Group" },
    { ...pkg("delhi-umrah", "delhi"), category: "Umrah Fixed Group" },
    { ...pkg("hajj", ""), category: "Hajj" },
  ] as CmsPackageRecord[];
  const slugs = (city: string, category = "") =>
    matchPackages(all, { city, category, season: "" }).map((item) => item.slug);
  assert.deepEqual(slugs("Mumbai"), ["mumbai-umrah"]);
  assert.deepEqual(slugs("", "Hajj"), ["hajj"]);
  assert.deepEqual(slugs("All India"), ["mumbai-umrah", "delhi-umrah", "hajj"]);
});

test("readCatalogFilter: first value only, capped at 60 characters", () => {
  const filter = readCatalogFilter({ city: ["Delhi", "Mumbai"], category: "x".repeat(80) });
  assert.equal(filter.city, "Delhi");
  assert.equal(filter.category.length, 60);
  assert.equal(filter.season, "");
});
