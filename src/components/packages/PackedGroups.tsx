/**
 * Labelled groups of package cards — a month, a category — packed side by side
 * in one grid instead of a full-width row each.
 *
 * Most groups hold one or two cards, and a row per group left two thirds of
 * the page empty and made the visitor scroll past it. Here every group spans
 * as many columns as it has cards (up to the row), so January, December and
 * November sit next to each other, and a busy month still gets the full width
 * with every card visible. A carousel per group was considered and rejected:
 * it hides the second package behind an arrow few people press, and shows
 * dead arrows on the many groups that have one card.
 *
 * Groups use `subgrid` on both axes while they fit in a single row, so the
 * headings of neighbouring groups share one row and their cards start on the
 * same line however much the headings wrap. A group too big for one row keeps
 * its own rows (it spans the whole width, so there is nothing to align with).
 *
 * The cards must be direct children of the group — ManagedPackagesCatalog
 * renders a fragment for exactly that. Spacing above a heading is the caller's
 * (a `pt-*` on the heading), since the grid's row gap also separates cards.
 */

const GAP = "gap-x-6 gap-y-6 md:gap-x-8 md:gap-y-8";

export function PackedGroupGrid({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-1 ${GAP} sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Static strings so Tailwind sees every class. Columns are 1 / 2 / 3 at
 * base / sm / lg; rows are subgridded only at the breakpoints where the
 * group's cards fit beside each other on one line.
 */
function spanClasses(count: number): string {
  if (count <= 1) return "sm:row-span-2 sm:grid-rows-subgrid";
  if (count === 2) return "sm:col-span-2 sm:row-span-2 sm:grid-rows-subgrid";
  if (count === 3)
    return "sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:grid-rows-subgrid";
  return "sm:col-span-2 lg:col-span-3";
}

export function PackedGroup({
  heading,
  count,
  children,
}: {
  heading: React.ReactNode;
  /** How many cards follow — decides how many columns the group takes. */
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-subgrid ${GAP} ${spanClasses(count)}`}>
      <div className="col-span-full">{heading}</div>
      {children}
    </div>
  );
}
