import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight, FiPhone } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import Footer from "@/app/components/Footer";
import JsonLd from "@/app/components/JsonLd";
import ManagedPackagesCatalog from "@/app/components/ManagedPackagesCatalog";
import PriceChangeNote from "@/app/components/PriceChangeNote";
import { PackedGroup, PackedGroupGrid } from "@/app/components/PackedGroups";
import { groupByCity } from "@/lib/cityPackages";
import { cityName, cityPath, type CityKey } from "@/lib/departures";
import {
  CATEGORY_BY_SLUG,
  CATEGORY_SLUGS,
  categorySlug,
} from "@/lib/categories";
import { CATEGORY_LANDING } from "@/lib/categoryLanding";
import { getPublicCatalog } from "@/lib/packages.server";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";
import type { CategoryType } from "@/app/components/packageData";

/**
 * Category landing pages — /packages/hajj, /packages/ziyarat, and so on.
 *
 * These URLs used to 404: the route tree had [category]/[slug] but nothing at
 * the category level, so a search for "hajj packages from india" had only the
 * homepage and the mixed catalog to match against. Each category now has a
 * page at its own URL with its own heading, copy and FAQs.
 */

const WHATSAPP_URL =
  "https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20your%20packages.";

type CategoryRouteParams = { category: string };

export function generateStaticParams() {
  return Object.values(CATEGORY_SLUGS).map((category) => ({ category }));
}

function resolve(slug: string): CategoryType | undefined {
  return CATEGORY_BY_SLUG[slug] as CategoryType | undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryRouteParams>;
}): Promise<Metadata> {
  const { category } = await params;
  const name = resolve(category);
  if (!name) return { title: "Packages Not Found" };

  const copy = CATEGORY_LANDING[name];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: `/packages/${category}` },
    openGraph: {
      title: `${copy.metaTitle} | Mufti Travels`,
      description: copy.metaDescription,
      type: "website",
    },
  };
}

export default async function CategoryLandingPage({
  params,
}: {
  params: Promise<CategoryRouteParams>;
}) {
  const { category } = await params;
  const name = resolve(category);
  if (!name) notFound();

  const copy = CATEGORY_LANDING[name];
  const { packages, tiers, tags } = await getPublicCatalog();
  const inCategory = packages.filter((item) => item.category === name);

  // Only ever quoted from real catalog data — never a placeholder.
  const fromPrice = inCategory
    .map((item) => Number(item.starting_price))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];

  // Split by departure city once the category spans two or more — one
  // heading above every package would only be clutter.
  const cityGroups = groupByCity(inCategory);
  const byCity = cityGroups.filter((group) => group.city).length >= 2;

  const others = (Object.keys(CATEGORY_SLUGS) as CategoryType[]).filter(
    (item) => item !== name,
  );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Packages", path: "/packages" },
          { name: copy.heading, path: `/packages/${category}` },
        ])}
      />
      <JsonLd data={faqSchema(copy.faqs)} />

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
              <Link href="/packages" className="hover:text-[#D4AF37]">
                Packages
              </Link>
              <span className="mx-2 text-stone-600">/</span>
              <span className="text-[#D4AF37]">{name}</span>
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
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1EBE5A]"
              >
                <FaWhatsapp className="h-4 w-4" /> Enquire on WhatsApp
              </a>
              <a
                href="tel:+919323063712"
                className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:border-[#D4AF37]"
              >
                <FiPhone className="h-4 w-4" /> +91 93230 63712
              </a>
              {fromPrice ? (
                <span className="font-body text-sm text-stone-400">
                  From{" "}
                  <span className="font-semibold text-white">
                    ₹{fromPrice.toLocaleString("en-IN")}
                  </span>{" "}
                  per person
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Available {name} packages
            </h2>

            {byCity ? (
              <PackedGroupGrid className="mt-2">
                {cityGroups.map((group) => (
                  <PackedGroup
                    key={group.city || "any"}
                    count={group.packages.length}
                    heading={
                      <CityHeading
                        city={group.city}
                        label={CITY_HEADING_LABEL[name]}
                      />
                    }
                  >
                    <ManagedPackagesCatalog
                      packages={group.packages}
                      tiers={tiers}
                      tags={tags}
                      fallback={null}
                    />
                  </PackedGroup>
                ))}
              </PackedGroupGrid>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
                <ManagedPackagesCatalog
                  packages={inCategory}
                  tiers={tiers}
                  tags={tags}
                  fallback={
                    <div className="col-span-full rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white p-10 text-center">
                      <p className="font-display text-2xl font-semibold text-[#06131D]">
                        Dates for this season are being finalised
                      </p>
                      <p className="mx-auto mt-2 max-w-xl font-body text-sm text-[#526168]">
                        Tell us your travel month and group size and we will
                        send the itinerary and pricing as soon as they are
                        confirmed.
                      </p>
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1EBE5A]"
                      >
                        <FaWhatsapp className="h-4 w-4" /> Ask about {name}
                      </a>
                    </div>
                  }
                />
              </div>
            )}
            {inCategory.length ? (
              <PriceChangeNote className="mt-8 max-w-3xl" />
            ) : null}
          </div>
        </section>

        {/* FAQs — visible on the page, which is what the FAQ schema requires */}
        <section className="border-t border-[#06131D]/10 bg-white px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Frequently asked
            </h2>
            <dl className="mt-8 space-y-6">
              {copy.faqs.map((faq) => (
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

        {/* Internal links to the sibling categories */}
        <section className="px-5 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-2xl font-bold text-[#06131D]">
              Other pilgrimage packages
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((other) => (
                <Link
                  key={other}
                  href={`/packages/${categorySlug(other)}`}
                  className="group flex items-center justify-between rounded-xl border border-[#06131D]/10 bg-white p-4 transition hover:border-[#D4AF37]"
                >
                  <span className="font-body text-sm font-semibold text-[#06131D]">
                    {CATEGORY_LANDING[other].heading}
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

/** "Ramadan Umrah from Mumbai" — what the heading calls this category. */
const CITY_HEADING_LABEL: Record<CategoryType, string> = {
  "Umrah Fixed Group": "Umrah fixed group",
  "Umrah Land Package": "Umrah land packages",
  Ziyarat: "Umrah + Ziyarat",
  Hajj: "Hajj",
  Ramzan: "Ramadan Umrah",
};

/**
 * One city's heading on a category page, linking to that city's page — the
 * permanent address for "from <city>", which is where the visitor (and
 * Google) should go next. Packages tied to no city get a plain heading.
 */
function CityHeading({
  city,
  label,
}: {
  city: CityKey | "";
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-6">
      <h3 className="flex items-center gap-3 font-display text-2xl font-bold text-[#06131D] sm:text-3xl">
        <span className="h-px w-8 shrink-0 bg-[#D4AF37]" />
        {city ? `${label} from ${cityName(city)}` : "From any city"}
      </h3>
      {city ? (
        <Link
          href={cityPath(city)}
          className="inline-flex items-center gap-1 font-body text-xs font-semibold text-[#997A15] underline-offset-4 hover:underline"
        >
          All packages from {cityName(city)}{" "}
          <FiArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
