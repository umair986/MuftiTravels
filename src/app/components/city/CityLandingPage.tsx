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
  cheapestPrice,
  formatRupees,
  type CityKey,
  type TripFacts,
} from "@/lib/cityLanding";
import { getGuide } from "@/lib/guides";
import { getPublicCatalog, type PublicCatalog } from "@/lib/packages.server";
import { tierName } from "@/lib/taxonomy";
import {
  BUSINESS,
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
} from "@/lib/seo";

/**
 * Departure-city landing page — /umrah-packages-from-{mumbai,delhi,lucknow}.
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
 * The city's fixed-group package, read from the admin — or undefined when it
 * is not published. Metadata and page both go through here, so the price in
 * the search snippet, the hero, the card and the FAQ are always one number.
 */
function resolveFixedGroup(city: CityKey, catalog: PublicCatalog) {
  const slug = CITY_LANDING[city].fixedGroupSlug;
  const record = catalog.packages.find(
    (item) => item.category === "Umrah Fixed Group" && item.slug === slug,
  );
  if (!record) return undefined;

  const cell = cheapestPrice(record.prices);
  const trip: TripFacts = {
    price: cell && { ...cell, tier: tierName(cell.tier, catalog.tiers) },
    days: record.duration_days,
    nights: record.duration_nights,
  };
  return {
    record,
    href: `/packages/${CATEGORY_SLUGS["Umrah Fixed Group"]}/${record.slug}`,
    tierCount: Object.keys(record.prices ?? {}).length,
    trip,
  };
}

export async function cityMetadata(city: CityKey): Promise<Metadata> {
  const copy = CITY_LANDING[city];
  const fixedGroup = resolveFixedGroup(city, await getPublicCatalog());
  const price = fixedGroup?.trip.price;
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
      ...(fixedGroup?.record.image_url
        ? { images: [{ url: fixedGroup.record.image_url, alt: copy.heading }] }
        : {}),
    },
  };
}

export default async function CityLandingPage({ city }: { city: CityKey }) {
  const copy = CITY_LANDING[city];
  const catalog = await getPublicCatalog();
  const { packages, tiers, tags } = catalog;
  const fixedGroup = resolveFixedGroup(city, catalog);
  const price = fixedGroup?.trip.price;
  const faqs = copy.faqs(fixedGroup?.trip);
  const whatsapp = `${WHATSAPP_URL}${encodeURIComponent(copy.city)}.`;

  // The city's own package leads; any further fixed groups for the city added
  // through the admin follow it.
  const cityPattern = new RegExp(`\\b${copy.city}\\b`, "i");
  const moreFromCity = packages.filter(
    (item) =>
      item.category === "Umrah Fixed Group" &&
      item.slug !== copy.fixedGroupSlug &&
      (cityPattern.test(item.name) || cityPattern.test(item.slug)),
  );
  const cityPackages = fixedGroup
    ? [fixedGroup.record, ...moreFromCity]
    : moreFromCity;
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
{fixedGroup ? (
              <p className="mt-2 max-w-2xl font-body text-sm text-[#526168]">
                Fixed-group departures from {copy.city}, {fixedGroup.trip.days}{" "}
                days and {fixedGroup.trip.nights} nights, with{" "}
                {fixedGroup.tierCount} hotel tiers to choose from.
              </p>
            ) : null}

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              <ManagedPackagesCatalog
                packages={cityPackages}
                tiers={tiers}
                tags={tags}
                fallback={
                  <div className="col-span-full rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white p-10 text-center">
                    <p className="font-display text-2xl font-semibold text-[#06131D]">
                      Dates for the next {copy.city} group are being finalised
                    </p>
                    <p className="mx-auto mt-2 max-w-xl font-body text-sm text-[#526168]">
                      Tell us your travel month and group size and we will send
                      the itinerary and pricing as soon as they are confirmed.
                    </p>
                  </div>
                }
              />
            </div>
          </div>
        </section>

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
                ...(fixedGroup
                  ? [{ href: fixedGroup.href, label: fixedGroup.record.name }]
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
