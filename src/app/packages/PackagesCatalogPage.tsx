"use client";

import Link from "next/link";
import { FaKaaba, FaHotel, FaMosque, FaMoon, FaStarAndCrescent } from "react-icons/fa";
import ManagedPackagesCatalog from "@/app/components/ManagedPackagesCatalog";
import {
  DEPARTURE_CITIES,
  cityKeyFromName,
  packageCity,
  type CityKey,
} from "@/lib/departures";
import Footer from "@/app/components/Footer";
import type { CmsPackageRecord } from "@/lib/packages";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";
import CatalogFilters, { type CatalogFilter } from "./CatalogFilters";

const groupDefinitions = [
  {
    category: "Umrah Fixed Group",
    title: "Fixed Group Packages",
    description:
      "Air and hotel packages from Mumbai, Delhi, Lucknow, Hyderabad, Bangalore and Ahmedabad, priced month by month.",
    icon: <FaKaaba />,
  },
  {
    category: "Umrah Land Package",
    title: "Umrah Land Packages",
    description:
      "Flexible hotel and ground-service options for your pilgrimage.",
    icon: <FaHotel />,
  },
  {
    category: "Ziyarat",
    title: "Umrah + Ziyarat",
    description:
      "Extend your sacred journey with carefully planned heritage visits.",
    icon: <FaMosque />,
  },
  {
    category: "Hajj",
    title: "Hajj Packages",
    description: "Guided Hajj journeys with Mina, Arafat and Azizia arranged.",
    icon: <FaStarAndCrescent />,
  },
  {
    category: "Ramzan",
    title: "Ramadan Packages",
    description:
      "Umrah during Ramadan, including the last ten nights and Laylatul Qadr.",
    icon: <FaMoon />,
  },
];

/**
 * Narrow the catalog to what the visitor asked for — the hero search, or the
 * city chips on this page.
 *
 * City is the package's `departure_city` (migration 026), read through
 * packageCity so a row from before the migration is still placed by its slug.
 * It used to be a substring match on the name, which put "Umrah + Dubai" under
 * any city whose name appeared in its description. A city value that is not
 * one of the six ("All India", or anything typed into the URL) narrows
 * nothing.
 */
function matchPackages(
  packages: CmsPackageRecord[],
  filter: CatalogFilter,
): CmsPackageRecord[] {
  const city = cityKeyFromName(filter.city);
  return packages.filter((item) => {
    if (filter.category && item.category !== filter.category) return false;
    if (city && packageCity(item) !== city) return false;
    return true;
  });
}

export default function PackagesCatalogPage({
  packages,
  tiers,
  tags,
  filter,
}: {
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
  filter: CatalogFilter;
}) {
  const hasFilter = Boolean(filter.city || filter.category || filter.season);
  const activeCity = cityKeyFromName(filter.city);
  const matches = hasFilter ? matchPackages(packages, filter) : packages;

  // Never strand the visitor on an empty page: if the search matches nothing,
  // fall back to the whole catalog and say so in the summary above it.
  const usingMatches = matches.length > 0;
  const visible = usingMatches ? matches : packages;
  const groups =
    filter.category && usingMatches
      ? groupDefinitions.filter((group) => group.category === filter.category)
      : groupDefinitions;

  return (
    <>
      <main className="min-h-screen bg-[#FAF8F5] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-1 font-body text-xs font-semibold uppercase tracking-wider text-[#946E19]">
              <FaKaaba className="h-3.5 w-3.5" /> Curated pilgrimage packages
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-[#06131D] sm:text-6xl">
              Choose Your Sacred Journey
            </h1>
            <p className="mt-4 font-body text-base leading-relaxed text-stone-600 sm:text-lg">
              Explore fixed-group, land-only and Umrah plus Ziyarat packages from
              India.
            </p>
          </header>

          <CityChips active={activeCity} category={filter.category} />

          {hasFilter && (
            <CatalogFilters filter={filter} matchCount={matches.length} />
          )}

          {/* Every package comes from the admin; a category with nothing
              published is left out rather than padded with placeholders. */}
          {groups
            .filter((group) =>
              visible.some((item) => item.category === group.category),
            )
            .map((group) => (
            <PackageGroup
              key={group.category}
              title={group.title}
              description={group.description}
              icon={group.icon}
              packages={visible.filter(
                (item) => item.category === group.category,
              )}
              tiers={tiers}
              tags={tags}
            />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * One tap to narrow the catalogue to a departure city. Links, not buttons, so
 * each filtered view has an address that can be shared and is crawlable, and
 * the page needs no client state for it. A chosen category is carried along.
 *
 * Wraps rather than scrolling sideways: seven chips fit in two rows on a
 * 360px phone, and a horizontal scroller hides the last cities off-screen with
 * nothing to say they are there.
 */
function CityChips({
  active,
  category,
}: {
  active: CityKey | null;
  category: string;
}) {
  const href = (city: CityKey | null) => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    const query = params.toString();
    return query ? `/packages?${query}` : "/packages";
  };
  const chip = (selected: boolean) =>
    `rounded-full border px-4 py-2 font-body text-xs font-semibold transition sm:text-sm ${
      selected
        ? "border-[#D4AF37] bg-[#06131D] text-[#F3E5AB]"
        : "border-stone-200 bg-white text-stone-700 hover:border-[#D4AF37] hover:text-[#06131D]"
    }`;

  return (
    <nav
      aria-label="Departure city"
      className="mt-10 flex flex-wrap justify-center gap-2"
    >
      <Link
        href={href(null)}
        aria-current={active === null ? "page" : undefined}
        className={chip(active === null)}
      >
        All cities
      </Link>
      {DEPARTURE_CITIES.map((city) => (
        <Link
          key={city.key}
          href={href(city.key)}
          aria-current={active === city.key ? "page" : undefined}
          className={chip(active === city.key)}
        >
          {city.name}
        </Link>
      ))}
    </nav>
  );
}

function PackageGroup({
  title,
  description,
  icon,
  packages,
  tiers,
  tags,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
}) {
  return (
    <section className="mt-20 first:mt-16">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#06131D]/10 pb-5">
        <div>
          <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
            <span className="text-[#D4AF37]">{icon}</span>
            {title}
          </h2>
          <p className="mt-2 font-body text-sm text-stone-600">{description}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManagedPackagesCatalog
          packages={packages}
          tiers={tiers}
          tags={tags}
          fallback={null}
        />
      </div>
    </section>
  );
}
