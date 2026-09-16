import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckSquare,
  FiClock,
  FiExternalLink,
  FiInfo,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import Footer from "@/app/components/Footer";
import JsonLd from "@/app/components/JsonLd";
import RichText from "../RichText";
import { CITY_LANDING, type CityKey } from "@/lib/cityLanding";
import { GUIDES, getGuide, type GuideBlock } from "@/lib/guides";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  organizationSchema,
} from "@/lib/seo";

type GuideRouteParams = { slug: string };

const WHATSAPP_URL =
  "https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20have%20a%20question%20about%20Umrah%20documents.";

// Only the slugs in lib/guides.ts exist; anything else is a 404, not a render.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<GuideRouteParams>;
}): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return { title: "Guide Not Found" };

  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} | Mufti Travels`,
      description: guide.description,
      type: "article",
      publishedTime: guide.published,
      modifiedTime: guide.reviewed,
      images: [{ url: guide.image.src, alt: guide.image.alt }],
    },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="font-body text-base leading-relaxed text-[#3A4A52]">
          <RichText text={block.text} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          className={`space-y-3 pl-5 font-body text-base leading-relaxed text-[#3A4A52] marker:text-[#D4AF37] ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item) => (
            <li key={item.slice(0, 48)} className="pl-1">
              <RichText text={item} />
            </li>
          ))}
        </List>
      );
    }
    case "callout": {
      const warning = block.tone === "warning";
      const Icon = warning ? FiAlertTriangle : FiInfo;
      return (
        <aside
          className={`rounded-2xl border p-5 sm:p-6 ${
            warning
              ? "border-amber-300 bg-amber-50"
              : "border-[#D4AF37]/40 bg-[#D4AF37]/[0.07]"
          }`}
        >
          <p className="flex items-center gap-2 font-display text-xl font-semibold text-[#06131D]">
            <Icon
              className={`h-5 w-5 shrink-0 ${warning ? "text-amber-600" : "text-[#997A15]"}`}
            />
            {block.title}
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-[#3A4A52] sm:text-base">
            <RichText text={block.text} />
          </p>
        </aside>
      );
    }
    case "checklist":
      return (
        <ul className="grid gap-3 rounded-2xl border border-[#06131D]/10 bg-white p-5 sm:grid-cols-2 sm:p-6">
          {block.items.map((item) => (
            <li
              key={item.slice(0, 48)}
              className="flex items-start gap-3 font-body text-sm leading-relaxed text-[#3A4A52]"
            >
              <FiCheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<GuideRouteParams>;
}) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  const cities = Object.keys(CITY_LANDING) as CityKey[];

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd
        data={articleSchema({
          slug: guide.slug,
          title: guide.title,
          description: guide.description,
          image: guide.image.src,
          published: guide.published,
          reviewed: guide.reviewed,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path },
        ])}
      />
      <JsonLd data={faqSchema(guide.faqs)} />

      <main className="min-h-screen bg-[#FAF8F5]">
        {/* Heading over the photograph */}
        <header className="relative overflow-hidden bg-[#06131D]">
          <Image
            src={guide.image.src}
            alt={guide.image.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/70 to-[#06131D]/40" />
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-14 sm:px-8">
            <nav
              aria-label="Breadcrumb"
              className="font-body text-xs text-stone-400"
            >
              <Link href="/" className="hover:text-[#D4AF37]">
                Home
              </Link>
              <span className="mx-2 text-stone-600">/</span>
              <Link href="/guides" className="hover:text-[#D4AF37]">
                Guides
              </Link>
            </nav>
            <p className="mt-10 font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
              {guide.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-stone-300">
              <span>
                Sources checked{" "}
                <time dateTime={guide.reviewed}>{formatDate(guide.reviewed)}</time>
              </span>
              <span className="flex items-center gap-1">
                <FiClock className="h-3.5 w-3.5 text-[#D4AF37]" />
                {guide.readingMinutes} min read
              </span>
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
          <div className="space-y-5">
            {guide.intro.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="font-body text-lg leading-relaxed text-[#3A4A52]"
              >
                <RichText text={paragraph} />
              </p>
            ))}
          </div>

          {/* Contents */}
          <nav
            aria-label="Contents"
            className="mt-10 rounded-2xl border border-[#06131D]/10 bg-white p-5 sm:p-6"
          >
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#997A15]">
              In this guide
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {guide.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="font-body text-sm font-medium text-[#06131D] hover:text-[#997A15]"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#faq"
                  className="font-body text-sm font-medium text-[#06131D] hover:text-[#997A15]"
                >
                  Frequently asked
                </a>
              </li>
            </ol>
          </nav>

          {guide.sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-14 scroll-mt-28">
              <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
                {section.heading}
              </h2>
              <div className="mt-5 space-y-5">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}

          {/* Enquiry */}
          <aside className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-[#D4AF37]/30 bg-[#06131D] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="font-display text-2xl font-bold text-white">
                Not sure about a document?
              </p>
              <p className="mt-1 font-body text-sm text-stone-300">
                Ask us on WhatsApp before you book, and we will go through it
                with you.
              </p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1EBE5A]"
            >
              <FaWhatsapp className="h-4 w-4" /> Ask on WhatsApp
            </a>
          </aside>

          {/* FAQs — visible on the page, which is what the FAQ schema requires */}
          <section id="faq" className="mt-14 scroll-mt-28">
            <h2 className="font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
              Frequently asked
            </h2>
            <dl className="mt-6 space-y-4">
              {guide.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-stone-200 bg-white p-6"
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
          </section>

          {/* Sources */}
          <section className="mt-14 border-t border-[#06131D]/10 pt-8">
            <h2 className="font-display text-2xl font-bold text-[#06131D]">
              Official sources
            </h2>
            <p className="mt-2 font-body text-sm text-[#526168]">
              Checked on {formatDate(guide.reviewed)}. Government rules change —
              confirm with these before you travel.
            </p>
            <ul className="mt-4 space-y-2">
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 font-body text-sm text-[#997A15] hover:underline"
                  >
                    <FiExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Onward */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold text-[#06131D]">
              Ready to plan your Umrah?
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={CITY_LANDING[city].path}
                  className="group flex items-center justify-between rounded-xl border border-[#06131D]/10 bg-white p-4 transition hover:border-[#D4AF37]"
                >
                  <span className="font-body text-sm font-semibold text-[#06131D]">
                    {CITY_LANDING[city].heading}
                  </span>
                  <FiArrowRight className="h-4 w-4 shrink-0 text-[#B2891E] transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
