import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowRight, FiClock, FiMapPin, FiPhone } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import Footer from "@/app/components/Footer";
import JsonLd from "@/app/components/JsonLd";
import ManagedPackagesCatalog from "@/app/components/ManagedPackagesCatalog";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { CATEGORY_LANDING } from "@/lib/categoryLanding";
import {
  CITY_LANDING,
  formatRupees,
  type CityKey,
  type TripFacts,
} from "@/lib/cityLanding";
import {
  cityFromPrice,
  groupByMonth,
  monthlyUmrah,
  packagesForCity,
} from "@/lib/cityPackages";
import { getGuide } from "@/lib/guides";
import type { CmsPackageRecord } from "@/lib/packages";
import { getPublicCatalog, type PublicCatalog } from "@/lib/packages.server";
import { tierName, type PackageTagRecord, type PackageTierRecord } from "@/lib/taxonomy";
import {
  BUSINESS,
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
} from "@/lib/seo";

/**
 * Departure-city landing page — /umrah-packages-from-<city>, one per entry in
 * DEPARTURE_CITIES.
 *
 * This is the page with the permanent address. Umrah packages are made per
 * month and leave the site when their month ends (docs/monthly-packages.md),
 * so the link that gets shared, advertised and ranked is this one, and the
 * monthly packages beneath it come and go. Newest month first.
 *
 * Laid out like the category landing pages so the two read as one family:
 * heading and intro, the packages that depart from this city, the office (where
 * there is one), FAQs, and links onward. Each city is a thin route file that
 * calls `cityMetadata` and renders this with its key.
 */

// Linked from every city page: the FAQ there answers "what documents" briefly.
const documentsGuide = getGuide("umrah-documents-passport-visa-india");

const WHATSAPP_URL =
  "https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20Umrah%20from%20";

// Same embed as the homepage contact section.
const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d942.797227481456!2d72.84293416954392!3d19.05543006650086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c923b0543ed1%3A0x7fba5dc35363fd9a!2sNational%20Girl%27s%20High%20School%20%26%20Junior%20College!5e0!3m2!1sen!2sin!4v1749732890489!5m2!1sen!2sin";

/**
 * The city's current Umrah offer: its newest month's package, and the lowest
 * price across every month still on sale — or undefined when the city has no
 * current Umrah package. Metadata and page both go through here, so the price
 * in the search snippet, the hero, the home-page card and the FAQ are always
 * one number.
 */
function resolveCityUmrah(city: CityKey, catalog: PublicCatalog) {
  const umrah = monthlyUmrah(catalog.packages, city);
  const lead = umrah[0];
  if (!lead) return undefined;

  const cell = cityFromPrice(catalog.packages, city);
  const trip: TripFacts = {
    price: cell && {
      amount: cell.amount,
      room: cell.room,
      tier: tierName(cell.tier, catalog.tiers),
    },
    days: lead.duration_days,
    nights: lead.duration_nights,
  };
  return {
    lead,
    umrah,
    href: `/packages/${CATEGORY_SLUGS["Umrah Fixed Group"]}/${lead.slug}`,
    tierCount: Object.keys(lead.prices ?? {}).length,
    trip,
  };
}

export async function cityMetadata(city: CityKey): Promise<Metadata> {
  const copy = CITY_LANDING[city];
  const cityUmrah = resolveCityUmrah(city, await getPublicCatalog());
  const price = cityUmrah?.trip.price;
  const description = copy.metaDescription(
    price ? formatRupees(price.amount) : undefined,
  );
  return {
    title: copy.metaTitle,
    description,
    alternates: { canonical: copy.path },
    openGraph: {
      title: `${copy.metaTitle} | Mufti Travels`,
      description,
      type: "website",
      // Without a package photo the root layout's default share image applies.
      ...(cityUmrah?.lead.image_url
        ? { images: [{ url: cityUmrah.lead.image_url, alt: copy.heading }] }
        : {}),
    },
  };
}

export default async function CityLandingPage({ city }: { city: CityKey }) {
  const copy = CITY_LANDING[city];
  const catalog = await getPublicCatalog();
  const { packages, tiers, tags } = catalog;
  const cityUmrah = resolveCityUmrah(city, catalog);
  const price = cityUmrah?.trip.price;
  const faqs = copy.faqs(cityUmrah?.trip);
  const whatsapp = `${WHATSAPP_URL}${encodeURIComponent(copy.city)}.`;

  // Newest month first; each month gets its own heading so "November 2026"
  // and "October 2026" read as two offers rather than one long row.
  const monthGroups = groupByMonth(cityUmrah?.umrah ?? []);
  const fromCity = packagesForCity(packages, city);
  const otherSections = (
    [
      { category: "Ramzan", heading: `Ramadan Umrah from ${copy.city}` },
      { category: "Hajj", heading: `Hajj from ${copy.city}` },
      { category: "Ziyarat", heading: `Umrah + Ziyarat from ${copy.city}` },
    ] as const
  )
    .map((section) => ({
      ...section,
      packages: fromCity.filter((item) => item.category === section.category),
    }))
    .filter((section) => section.packages.length);
  const landPackages = packages.filter(
    (item) => item.category === "Umrah Land Package",
  );

  const phoneDisplay = BUSINESS.phone.replace(/-/g, " ");
  const phoneHref = `tel:${BUSINESS.phone.replace(/-/g, "")}`;

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: copy.heading, path: copy.path },
        ])}
      />
      <JsonLd data={faqSchema(faqs)} />

      <main className="min-h-screen bg-[#FAF8F5]">
        {/* Heading */}
        <section className="bg-[#06131D] px-5 pb-16 pt-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <nav
              aria-label="Breadcrumb"
              className="font-body text-xs text-stone-400"
            >
              <Link href="/" className="hover:text-[#D4AF37]">
                Home
              </Link>
              <span className="mx-2 text-stone-600">/</span>
              <span className="text-[#D4AF37]">{copy.heading}</span>
            </nav>

            <p className="mt-8 font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {copy.heading}
            </h1>

            <div className="mt-6 max-w-3xl space-y-4">
              {copy.intro.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="font-body text-sm leading-relaxed text-stone-300 sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1EBE5A]"
              >
                <FaWhatsapp className="h-4 w-4" /> Enquire on WhatsApp
              </a>
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:border-[#D4AF37]"
              >
                <FiPhone className="h-4 w-4" /> {phoneDisplay}
              </a>
              {price ? (
                <span className="font-body text-sm text-stone-400">
                  From{" "}
                  <span className="font-semibold text-white">
                    {formatRupees(price.amount)}
                  </span>{" "}
                  per person
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Packages departing this city */}
        <section className="px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Umrah from {copy.city}: flights, hotels and visa
            </h2>
            {cityUmrah ? (
              <p className="mt-2 max-w-2xl font-body text-sm text-[#526168]">
                Fixed-group departures from {copy.city}, {cityUmrah.trip.days}{" "}
                days and {cityUmrah.trip.nights} nights, with{" "}
                {cityUmrah.tierCount === 1
                  ? "one hotel tier"
                  : `${cityUmrah.tierCount} hotel tiers to choose from`}
                . Prices are set
                month by month with flight and hotel rates; Ramadan and winter
                departures are priced separately.{" "}
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#997A15] underline-offset-4 hover:underline"
                >
                  WhatsApp us for the nearest date and today&apos;s rate.
                </a>
              </p>
            ) : null}

            {monthGroups.length ? (
              monthGroups.map((group) => (
                <div key={group.month ?? "undated"} className="mt-10">
                  {group.label ? (
                    <h3 className="flex items-center gap-3 font-display text-2xl font-semibold text-[#06131D]">
                      <span className="h-px w-8 bg-[#D4AF37]" />
                      {group.label}
                    </h3>
                  ) : null}
                  <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
                    <ManagedPackagesCatalog
                      packages={group.packages}
                      tiers={tiers}
                      tags={tags}
                      fallback={null}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white p-10 text-center">
                <p className="font-display text-2xl font-semibold text-[#06131D]">
                  This month&apos;s {copy.city} prices are being finalised
                </p>
                <p className="mx-auto mt-2 max-w-xl font-body text-sm text-[#526168]">
                  Tell us your travel month and group size and we will send the
                  nearest date, the itinerary and today&apos;s price.
                </p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1EBE5A]"
                >
                  <FaWhatsapp className="h-4 w-4" /> Ask on WhatsApp
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Ramadan, Hajj and Ziyarat departing this city — only those it has */}
        {otherSections.map((section) => (
          <CitySection
            key={section.category}
            heading={section.heading}
            packages={section.packages}
            tiers={tiers}
            tags={tags}
          />
        ))}

        {/* Land packages — for pilgrims flying on their own ticket */}
        <section className="border-t border-[#06131D]/10 px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Booking your own flight from {copy.city}?
            </h2>
            <p className="mt-2 max-w-2xl font-body text-sm text-[#526168]">
              {CATEGORY_LANDING["Umrah Land Package"].intro[0]}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              <ManagedPackagesCatalog
                packages={landPackages}
                tiers={tiers}
                tags={tags}
                fallback={
                  <Link
                    href={`/packages/${CATEGORY_SLUGS["Umrah Land Package"]}`}
                    className="group col-span-full flex items-center justify-between rounded-2xl border border-[#D4AF37]/40 bg-white p-6 transition hover:border-[#D4AF37]"
                  >
                    <span className="font-display text-2xl font-semibold text-[#06131D]">
                      See our Umrah land packages
                    </span>
                    <FiArrowRight className="h-5 w-5 shrink-0 text-[#B2891E] transition group-hover:translate-x-0.5" />
                  </Link>
                }
              />
            </div>
          </div>
        </section>

        {/* The office — the local signal this page exists to carry */}
        {copy.hasOffice ? (
          <section className="bg-[#06131D] px-5 py-14 sm:px-8 lg:px-12">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
                  Visit us
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                  Our {copy.city} office
                </h2>
                <p className="mt-3 max-w-xl font-body text-sm leading-relaxed text-stone-300">
                  Come in before you book. We will go through the hotels, the
                  room sharing and your documents with you, face to face.
                </p>

                <address className="mt-6 space-y-3 font-body text-sm not-italic text-stone-200">
                  <p className="flex items-start gap-3">
                    <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <span>
                      {BUSINESS.name}, {BUSINESS.street}, {BUSINESS.locality},{" "}
                      {BUSINESS.region} — {BUSINESS.postalCode}
                    </span>
                  </p>
                  <p className="flex items-start gap-3">
                    <FiClock className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <span>{BUSINESS.hoursLabel}</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <FiPhone className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <a href={phoneHref} className="hover:text-[#D4AF37]">
                      {phoneDisplay}
                    </a>
                  </p>
                </address>
              </div>

              <div className="h-72 overflow-hidden rounded-2xl border border-[#D4AF37]/30">
                <iframe
                  src={MAP_EMBED}
                  width="100%"
                  height="100%"
                  allowFullScreen
                  loading="lazy"
                  title={`${BUSINESS.name} office in ${copy.city}`}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQs — visible on the page, which is what the FAQ schema requires */}
        <section className="bg-white px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Umrah from {copy.city}: frequently asked
            </h2>
            <dl className="mt-8 space-y-6">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-6"
                >
                  <dt className="font-display text-xl font-semibold text-[#06131D]">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 font-body text-sm leading-relaxed text-[#526168]">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Internal links onward */}
        <section className="px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-2xl font-bold text-[#06131D]">
              More pilgrimage packages
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ...(cityUmrah
                  ? [{ href: cityUmrah.href, label: cityUmrah.lead.name }]
                  : []),
                ...(documentsGuide
                  ? [
                      {
                        href: `/guides/${documentsGuide.slug}`,
                        label: "Guide: Umrah documents from India",
                      },
                    ]
                  : []),
                // The other departure cities, so the city pages link to each other.
                ...(Object.keys(CITY_LANDING) as CityKey[])
                  .filter((other) => other !== city)
                  .map((other) => ({
                    href: CITY_LANDING[other].path,
                    label: CITY_LANDING[other].heading,
                  })),
                ...(["Umrah Fixed Group", "Hajj", "Ziyarat"] as const).map(
                  (category) => ({
                    href: `/packages/${CATEGORY_SLUGS[category]}`,
                    label: CATEGORY_LANDING[category].heading,
                  }),
                ),
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between rounded-xl border border-[#06131D]/10 bg-white p-4 transition hover:border-[#D4AF37]"
                >
                  <span className="font-body text-sm font-semibold text-[#06131D]">
                    {link.label}
                  </span>
                  <FiArrowRight className="h-4 w-4 shrink-0 text-[#B2891E] transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CitySection({
  heading,
  packages,
  tiers,
  tags,
}: {
  heading: string;
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
}) {
  return (
    <section className="border-t border-[#06131D]/10 px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
          {heading}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <ManagedPackagesCatalog
            packages={packages}
            tiers={tiers}
            tags={tags}
            fallback={null}
          />
        </div>
      </div>
    </section>
  );
}
