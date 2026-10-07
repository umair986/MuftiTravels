import Image from "next/image";
import Link from "next/link";
import {
  FaHotel,
  FaKaaba,
  FaMoon,
  FaMosque,
  FaStarAndCrescent,
} from "react-icons/fa";
import { FiArrowRight, FiMapPin, FiPhoneCall } from "react-icons/fi";

import { CATEGORY_SLUGS } from "@/lib/categories";
import { CITY_LANDING, formatRupees } from "@/lib/cityLanding";
import { cityFromPrice, monthlyUmrah } from "@/lib/cityPackages";
import { DEPARTURE_CITIES, formatMonth, type CityKey } from "@/lib/departures";
import type { CmsPackageRecord } from "@/lib/packages";

/**
 * The home page's way into the catalogue: pick the city you fly from.
 *
 * It replaced a tabbed grid of every package when Umrah packages became
 * monthly (docs/monthly-packages.md). Those package pages come and go with the
 * month; the city pages they hang off do not, so the home page links to the
 * permanent ones.
 *
 * Mumbai is the home city and the office, so it gets the photograph and the
 * width; the other five sit beside it. Each card carries its "from" price —
 * the same number, from the same function, as the top of the page it opens —
 * so the visitor sees a price before they click, which is what keeps them
 * clicking. A city with nothing current says "enquire" rather than hiding:
 * the business sells from all six, and a WhatsApp enquiry is still a lead.
 */

const FEATURED: CityKey = "mumbai";

/** Used when Mumbai has no current package with a photo. */
const FALLBACK_IMAGE = "/Hero/hero1.jpg";

const CATEGORY_LINKS = [
  { category: "Ramzan", label: "Ramadan Umrah", icon: <FaMoon /> },
  { category: "Hajj", label: "Hajj", icon: <FaStarAndCrescent /> },
  {
    category: "Umrah Land Package",
    label: "Land packages (hotel only)",
    icon: <FaHotel />,
  },
  { category: "Ziyarat", label: "Umrah + Ziyarat", icon: <FaMosque /> },
] as const;

type CityCard = {
  key: CityKey;
  name: string;
  href: string;
  price?: number;
  /** The newest month the city has on sale, e.g. "November 2026". */
  month: string;
  image?: string;
};

function buildCards(packages: CmsPackageRecord[]): CityCard[] {
  return DEPARTURE_CITIES.map(({ key, name }) => {
    const umrah = monthlyUmrah(packages, key);
    const lead = umrah[0];
    return {
      key,
      name,
      href: CITY_LANDING[key].path,
      price: cityFromPrice(packages, key)?.amount,
      month: formatMonth(lead?.valid_month),
      image: umrah.find((item) => item.image_url)?.image_url,
    };
  });
}

export default function DepartureCities({
  packages,
}: {
  packages: CmsPackageRecord[];
}) {
  const cards = buildCards(packages);
  const featured = cards.find((card) => card.key === FEATURED)!;
  const others = cards.filter((card) => card.key !== FEATURED);

  return (
    <section
      className="relative overflow-hidden bg-[#FAF8F5] px-4 py-20 sm:px-6 lg:px-8"
      id="packages"
    >
      <div className="islamic-pattern pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#946E19]">
            <FaKaaba className="h-3.5 w-3.5" />
            <span>This month&apos;s Umrah packages</span>
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight text-[#06131D] sm:text-4xl md:text-5xl">
            Where are you{" "}
            <span className="gold-gradient-text italic">flying from?</span>
          </h2>
          <p className="font-body text-base leading-relaxed text-stone-600 sm:text-lg">
            Prices are set month by month with flight and hotel rates. Pick
            your city to see this month&apos;s packages — or WhatsApp us for
            the nearest date and today&apos;s price.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FeaturedCard card={featured} />
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {others.map((card, index) => (
              <SmallCard
                key={card.key}
                card={card}
                // Five cards in two columns leave a hole; the odd one out
                // takes the full row instead.
                wide={others.length % 2 === 1 && index === others.length - 1}
              />
            ))}
          </div>
        </div>

        {/* The categories that are not monthly, so they stay one click away. */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {CATEGORY_LINKS.map((link) => (
            <Link
              key={link.category}
              href={`/packages/${CATEGORY_SLUGS[link.category]}`}
              className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 font-body text-xs font-bold text-stone-700 shadow-sm transition hover:border-[#D4AF37] hover:text-[#06131D] sm:text-sm"
            >
              <span className="text-[#B2891E]">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Custom package consultation banner — carried over from the tabbed
            grid this section replaced. */}
        <div className="relative mt-16 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[#06131D] p-8 text-white shadow-2xl sm:p-10 md:flex-row">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#F3E5AB]">
              Bespoke VIP Itineraries
            </span>
            <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Need a Custom Dates or Family VIP Suite Package?
            </h3>
            <p className="max-w-2xl font-body text-sm text-stone-300 sm:text-base">
              We specialize in custom Haram-view suites, private GMC Yukon
              transfers, and personalized scholar accompaniment for private
              family groups.
            </p>
          </div>

          <a
            href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20customise%20a%20VIP%20Umrah%20package."
            target="_blank"
            rel="noopener noreferrer"
            className="gold-gradient-bg flex flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-8 py-4 text-xs font-bold text-[#06131D] shadow-xl transition-all hover:brightness-110 sm:text-sm"
          >
            <FiPhoneCall className="h-4 w-4" />
            <span>Customize with an Expert</span>
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

function PriceLine({ card, light }: { card: CityCard; light?: boolean }) {
  if (!card.price) {
    return (
      <p
        className={`font-body text-sm font-semibold ${light ? "text-[#F3E5AB]" : "text-[#D4AF37]"}`}
      >
        Enquire for this month&apos;s price
      </p>
    );
  }
  return (
    <p className="font-body text-sm text-stone-300">
      Umrah from{" "}
      <span
        className={`font-display font-bold ${light ? "text-3xl text-white" : "text-xl text-[#F3E5AB]"}`}
      >
        {formatRupees(card.price)}
      </span>
    </p>
  );
}

function FeaturedCard({ card }: { card: CityCard }) {
  return (
    <Link
      href={card.href}
      className="group relative flex min-h-[22rem] overflow-hidden rounded-3xl border border-[#D4AF37]/40 shadow-xl lg:min-h-full"
    >
      <Image
        src={card.image || FALLBACK_IMAGE}
        alt={`Umrah packages from ${card.name}`}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/60 to-[#06131D]/10" />

      <div className="relative mt-auto w-full p-7 sm:p-9">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/50 bg-[#06131D]/60 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F3E5AB] backdrop-blur">
          <FiMapPin className="h-3 w-3" /> Our home city
          {/* Dropped on phones, where it wrapped the badge onto two lines. */}
          <span className="hidden sm:inline"> · Office in Bandra</span>
        </span>
        <h3 className="mt-4 font-display text-5xl font-bold text-white sm:text-6xl">
          {card.name}
        </h3>
        <div className="mt-3">
          <PriceLine card={card} light />
        </div>
        {card.month ? (
          <p className="mt-1 font-body text-xs text-stone-300">
            {card.month} prices · per person
          </p>
        ) : null}
        <span className="gold-gradient-bg mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-body text-sm font-bold text-[#06131D] shadow-lg transition group-hover:brightness-110">
          See packages from {card.name}
          <FiArrowRight className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function SmallCard({ card, wide }: { card: CityCard; wide?: boolean }) {
  return (
    <Link
      href={card.href}
      className={`${wide ? "col-span-2 " : ""}group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#06131D] p-5 shadow-md transition hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-xl sm:p-6`}
    >
      <div className="islamic-pattern-dark pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative flex items-start justify-between gap-2">
        <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
          {card.name}
        </h3>
        <FiArrowRight className="mt-2 h-4 w-4 flex-shrink-0 text-[#D4AF37] transition group-hover:translate-x-0.5" />
      </div>
      <div className="relative mt-4">
        <PriceLine card={card} />
        {card.month ? (
          <p className="mt-0.5 font-body text-[11px] text-stone-400">
            {card.month} prices
          </p>
        ) : null}
      </div>
    </Link>
  );
}
