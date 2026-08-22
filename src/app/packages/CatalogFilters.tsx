"use client";

import Link from "next/link";
import { FiX } from "react-icons/fi";

export type CatalogFilter = {
  city: string;
  category: string;
  season: string;
};

/**
 * Shows what the visitor chose in the hero search and lets them undo it.
 *
 * The hero used to throw its three selections away and push to an unfiltered
 * list. City and category now genuinely filter; season has no equivalent in the
 * package data, so it is carried into the enquiry rather than pretending to
 * narrow anything — saying so is better than silently ignoring it.
 */
export default function CatalogFilters({
  filter,
  matchCount,
}: {
  filter: CatalogFilter;
  matchCount: number;
}) {
  const chips = [
    filter.city && filter.city !== "All India"
      ? { label: "Departing from", value: filter.city, filters: true }
      : null,
    filter.category ? { label: "Type", value: filter.category, filters: true } : null,
    filter.season ? { label: "When", value: filter.season, filters: false } : null,
  ].filter(Boolean) as { label: string; value: string; filters: boolean }[];

  if (!chips.length) return null;

  return (
    <section className="mt-10 rounded-2xl border border-[#D4AF37]/30 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-[#946E19]">
            Showing your search
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-[#FAF8F5] px-3 py-1.5 font-body text-xs text-[#06131D]"
              >
                <span className="text-stone-500">{chip.label}:</span>
                <span className="font-semibold">{chip.value}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 font-body text-sm text-stone-600">
            {matchCount === 0
              ? "No packages match this exactly — everything we run is listed below."
              : `${matchCount} package${matchCount === 1 ? "" : "s"} match.`}
            {filter.season && (
              <>
                {" "}
                Dates for{" "}
                <span className="font-semibold text-[#06131D]">
                  {filter.season}
                </span>{" "}
                vary by group — mention it when you enquire and we will send the
                schedule.
              </>
            )}
          </p>
        </div>

        <Link
          href="/packages"
          className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-full border border-stone-300 px-4 py-2 font-body text-xs font-semibold text-[#06131D] transition hover:border-[#D4AF37] hover:text-[#946E19] sm:self-center"
        >
          <FiX className="h-3.5 w-3.5" />
          Clear search
        </Link>
      </div>
    </section>
  );
}
