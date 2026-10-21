import { FiArrowRight, FiCheck, FiMapPin, FiStar } from "react-icons/fi";

import type { TierPriceMap } from "@/app/components/packageData";
import type { PackageTierRecord } from "@/lib/taxonomy";

/**
 * "Where you'll stay" on a package page — one tab per tier the package is
 * priced in, each showing how far that tier's hotels are from the Haram and
 * from Masjid an-Nabawi, their stars and selling points.
 *
 * Every fact is admin data — from Tags & Tiers (migration 028), overridden per
 * package by the editor's Hotels section (032; the caller passes the registry
 * through withPackageHotels). This component adds only headings. The selected tab is the same state as the price box's
 * tier, so choosing Gold here prices Gold there, and the other way round.
 *
 * When the open tab is not the recommended tier and the package offers it, a
 * nudge compares the two distances and switches tabs on click.
 */
export default function TierHotels({
  prices,
  registry,
  selected,
  onSelect,
}: {
  prices: TierPriceMap;
  registry: PackageTierRecord[];
  /** A key of `prices` (a tier key, or a display name on legacy data). */
  selected: string;
  onSelect: (tier: string) => void;
}) {
  // The package's own tiers, in registry order, each with its record.
  const offered = Object.keys(prices)
    .map((key) => ({
      key,
      record: registry.find((tier) => tier.key === key || tier.name === key),
    }))
    .sort(
      (a, b) =>
        (a.record?.sort_order ?? Infinity) - (b.record?.sort_order ?? Infinity),
    );
  // Nothing to say until at least one tier has its hotels filled in.
  if (!offered.some(({ record }) => hasHotelFacts(record))) return null;

  const current = offered.find(({ key }) => key === selected) ?? offered[0];
  const recommended = offered.find(({ record }) => record?.is_recommended);
  const fromPrice = (key: string) => {
    const amounts = Object.values(
      (prices[key as keyof TierPriceMap] ?? {}) as Record<string, number>,
    ).filter((amount) => Number(amount) > 0);
    return amounts.length ? Math.min(...amounts) : undefined;
  };

  return (
    <section className="mt-10 border-t border-stone-200 pt-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#946E19]">
        Choose your hotels
      </p>
      <h2 className="mt-1 font-display text-3xl font-bold text-[#06131D]">
        Where you&apos;ll stay
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        The biggest difference between tiers is how far you walk to the Haram
        in Makkah and to Masjid an-Nabawi in Madinah — five times a day, every
        day of your stay.
      </p>

      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Hotel tiers"
      >
        {offered.map(({ key, record }) => {
          const isActive = key === current.key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(key)}
              className={`relative shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-[#06131D] bg-[#06131D] text-[#F3E5AB]"
                  : "border-stone-200 bg-white text-stone-600 hover:border-[#D4AF37] hover:text-[#06131D]"
              }`}
            >
              {record?.name ?? key}
              {record?.is_recommended && (
                <FiStar
                  aria-label="Recommended"
                  className="ml-1.5 inline h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]"
                />
              )}
            </button>
          );
        })}
      </div>

      <TierPanel
        record={current.record}
        name={current.record?.name ?? current.key}
        price={fromPrice(current.key)}
      />

      {recommended &&
      recommended.key !== current.key &&
      hasHotelFacts(recommended.record) &&
      hasHotelFacts(current.record) ? (
        <button
          type="button"
          onClick={() => onSelect(recommended.key)}
          className="group mt-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-[#D4AF37]/50 bg-[#FFFCF3] p-4 text-left transition hover:border-[#D4AF37]"
        >
          <span className="text-sm leading-relaxed text-[#06131D]">
            <span className="font-semibold">
              Upgrade to {recommended.record?.name}:
            </span>{" "}
            {upgradeLine(current.record, recommended.record)}
          </span>
          <FiArrowRight className="h-5 w-5 shrink-0 text-[#B2891E] transition group-hover:translate-x-0.5" />
        </button>
      ) : null}
    </section>
  );
}

function hasHotelFacts(record: PackageTierRecord | undefined): boolean {
  return Boolean(record?.makkah_distance || record?.madinah_distance);
}

/** "300 m from the Haram instead of 1,500 m; 0 m from … instead of 900 m." */
function upgradeLine(
  from: PackageTierRecord | undefined,
  to: PackageTierRecord | undefined,
): string {
  const parts: string[] = [];
  if (to?.makkah_distance && from?.makkah_distance) {
    parts.push(
      `${to.makkah_distance} from the Haram instead of ${from.makkah_distance}`,
    );
  }
  if (to?.madinah_distance && from?.madinah_distance) {
    parts.push(
      `${to.madinah_distance} from Masjid an-Nabawi instead of ${from.madinah_distance}`,
    );
  }
  return `${parts.join("; ")}.`;
}

function TierPanel({
  record,
  name,
  price,
}: {
  record: PackageTierRecord | undefined;
  name: string;
  price: number | undefined;
}) {
  const stars = Math.min(5, Math.max(0, record?.hotel_stars ?? 0));
  const isRecommended = Boolean(record?.is_recommended);

  return (
    <div
      role="tabpanel"
      className={`islamic-pattern-dark relative mt-5 rounded-3xl bg-[#06131D] p-6 sm:p-8 ${
        isRecommended
          ? "border-2 border-[#D4AF37] shadow-[0_20px_60px_-25px_rgba(212,175,55,0.55)]"
          : "border border-[#06131D]"
      }`}
    >
      {isRecommended && (
        <span className="absolute -top-3 left-6 rounded-full gold-gradient-bg px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#06131D]">
          Recommended
        </span>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-3xl font-bold text-white">
            {name}
          </h3>
          {price ? (
            <p className="mt-1 text-sm text-stone-400">
              From{" "}
              <span className="font-semibold text-white">
                ₹{price.toLocaleString("en-IN")}
              </span>{" "}
              per person
            </p>
          ) : null}
        </div>
        {stars ? (
          <span
            className="flex items-center gap-1 text-[#D4AF37]"
            aria-label={`${stars}-star hotels`}
          >
            {Array.from({ length: stars }, (_, index) => (
              <FiStar key={index} className="h-4 w-4 fill-current" />
            ))}
            <span className="ml-1 text-xs font-semibold text-stone-300">
              {stars}-star hotels
            </span>
          </span>
        ) : null}
      </div>

      {hasHotelFacts(record) ? (
        <dl className="mt-6 grid gap-5 border-y border-white/10 py-6 sm:grid-cols-2">
          {record?.makkah_distance ? (
            <Distance
              place="Makkah"
              to="from Masjid al-Haram"
              value={record.makkah_distance}
              hotel={record.makkah_hotel}
              highlight={isRecommended}
            />
          ) : null}
          {record?.madinah_distance ? (
            <Distance
              place="Madinah"
              to="from Masjid an-Nabawi"
              value={record.madinah_distance}
              hotel={record.madinah_hotel}
              highlight={isRecommended}
            />
          ) : null}
        </dl>
      ) : (
        <p className="mt-6 border-y border-white/10 py-6 text-sm text-stone-300">
          Ask us for the hotels in this tier — we will share the names and
          distances for your dates.
        </p>
      )}

      {record?.highlights?.length ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {record.highlights.map((line) => (
            <li
              key={line}
              className="flex gap-2.5 text-sm leading-relaxed text-stone-300"
            >
              <FiCheck className="mt-1 h-4 w-4 shrink-0 text-[#D4AF37]" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Distance({
  place,
  to,
  value,
  hotel,
  highlight,
}: {
  place: string;
  to: string;
  value: string;
  /** The tie-up hotel (migration 030); omitted when the tier names none. */
  hotel?: string;
  highlight: boolean;
}) {
  const name = hotel?.trim();
  return (
    <div className="flex items-start gap-3">
      <FiMapPin className="mt-1 h-4 w-4 shrink-0 text-[#D4AF37]" />
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          {place}
        </dt>
        {name ? (
          <dd className="mt-0.5 text-sm font-semibold text-[#F3E5AB]">
            {name}
          </dd>
        ) : null}
        <dd className="text-sm text-stone-300">
          <span
            className={`font-display text-3xl font-bold ${
              highlight ? "text-[#F3E5AB]" : "text-white"
            }`}
          >
            {value}
          </span>{" "}
          {to}
        </dd>
      </div>
    </div>
  );
}
