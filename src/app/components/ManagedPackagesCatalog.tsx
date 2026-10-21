"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiCalendar, FiClock, FiMapPin } from "react-icons/fi";
import { FaKaaba, FaPlaneDeparture } from "react-icons/fa";
import { stayNights } from "@/lib/categoryFields";
import { flightCarrier, formatDepartureDates } from "@/lib/departures";
import { CmsPackageRecord } from "@/lib/packages";
import { cardPrice } from "@/lib/packages";
import {
  tierName,
  type PackageTagRecord,
  type PackageTierRecord,
} from "@/lib/taxonomy";
import PackageTagBadges from "./PackageTagBadges";
import { categorySlug } from "@/lib/categories";

/**
 * Renders CMS packages for one category.
 *
 * Data arrives as props from a server component — this used to fetch in a
 * `useEffect`, which kept package names and prices out of the server HTML and
 * made every card swap in after hydration. `fallback` now renders only when
 * the category genuinely has no published packages.
 */
export default function ManagedPackagesCatalog({
  packages,
  tiers,
  tags,
  fallback,
}: {
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
  fallback: React.ReactNode;
}) {
  if (!packages.length) return <>{fallback}</>;

  return (
    <>
      {packages.map((item) => (
        <ManagedPackageCard
          key={item.id}
          record={item}
          tiers={tiers}
          tags={tags}
        />
      ))}
    </>
  );
}

/** "7 nights Makkah · 7 nights Madinah", or nothing until the admin fills it. */
function StayLine({ record }: { record: CmsPackageRecord }) {
  const { makkah, madinah } = stayNights(record.details);
  const parts = [
    makkah && `${makkah} night${makkah === 1 ? "" : "s"} Makkah`,
    madinah && `${madinah} night${madinah === 1 ? "" : "s"} Madinah`,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#06131D]">
      <FaKaaba className="h-3.5 w-3.5 shrink-0 text-[#B2891E]" />
      {parts.join(" · ")}
    </p>
  );
}

/**
 * "Saudia · Direct" and "Departs 5, 19 Nov · 3 Dec" — whichever the package
 * has (migration 028). Nothing at all when it has neither, and a blank routing
 * never prints "Direct".
 */
function FlightLine({ record }: { record: CmsPackageRecord }) {
  const carrier = flightCarrier(record);
  const dates = formatDepartureDates(record.departure_dates, { limit: 4 });
  if (!carrier && !dates) return null;

  return (
    <div className="mt-4 space-y-1.5 rounded-xl border border-[#D4AF37]/25 bg-[#FFFCF3] px-3.5 py-2.5 text-xs text-[#06131D]">
      {carrier && (
        <p className="flex items-center gap-2 font-semibold">
          <FaPlaneDeparture className="h-3.5 w-3.5 shrink-0 text-[#B2891E]" />
          {carrier}
        </p>
      )}
      {dates && (
        <p className="flex items-start gap-2">
          <FiCalendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B2891E]" />
          <span>
            <span className="font-semibold">Departs</span> {dates}
          </span>
        </p>
      )}
    </div>
  );
}

function ManagedPackageCard({
  record,
  tiers,
  tags,
}: {
  record: CmsPackageRecord;
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
}) {
  // The admin's chosen price, or the lowest one in the table — see cardPrice().
  // Undefined when nothing is priced yet — a Hajj season still being costed,
  // for instance — and the card says "On request" rather than a confident "₹0".
  const shown = cardPrice(record);
  const shownTierName = shown ? tierName(shown.tier, tiers) : undefined;
  // A real <a href>, not a button calling router.push: Google's crawler
  // follows links, not clicks, and a button left every package page reachable
  // only through the sitemap (SEO audit, 20 Oct 2026).
  const href = `/packages/${categorySlug(record.category)}/${record.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-2xl">
      <div className="relative h-60 w-full overflow-hidden bg-stone-900">
        <Image
          src={record.image_url}
          alt={record.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/80 via-transparent to-transparent" />
        {/* At most two tags, and no tier badge: the tier is already named
            beside the price, and four badges across a phone-width photo
            read as noise ("Budget · Mumbai Special · Budget · Popular"). */}
        <PackageTagBadges
          tagKeys={record.card_tags}
          registry={tags}
          limit={2}
          className="absolute left-3 right-3 top-3"
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#06131D]/85 px-3 py-1 text-xs font-medium text-[#F3E5AB]">
          <FiMapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>{record.destinations}</span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          <FiClock className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>{record.duration_days} Days</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            {record.category}
          </p>
          <h3 className="mt-2 line-clamp-2 font-card-title text-xl font-semibold leading-snug text-[#06131D] sm:text-[1.4rem] transition-colors group-hover:text-[#946E19]">
            <Link href={href}>{record.name}</Link>
          </h3>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">
            {record.description}
          </p>
          <StayLine record={record} />
          <FlightLine record={record} />
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {shown ? `${shownTierName} · ${shown.sharing}` : "Pricing"}
            </p>
            <p className="font-body text-2xl font-bold tabular-nums tracking-tight text-[#06131D]">
              {shown ? (
                <>
                  {record.currency === "INR" ? "₹" : record.currency}
                  {shown.amount.toLocaleString("en-IN")}
                </>
              ) : (
                "On request"
              )}
            </p>
          </div>
          <Link
            href={href}
            aria-label={`Book Now: ${record.name}`}
            className="flex items-center gap-1.5 rounded-xl gold-gradient-bg px-4 py-2.5 text-xs font-bold text-[#06131D] shadow-md transition-all hover:brightness-110 sm:text-sm"
          >
            <span>Book Now</span>
            <FiArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}
