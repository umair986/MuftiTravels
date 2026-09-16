import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiClock } from "react-icons/fi";

import Footer from "@/app/components/Footer";
import JsonLd from "@/app/components/JsonLd";
import { GUIDES } from "@/lib/guides";
import { breadcrumbSchema } from "@/lib/seo";

/**
 * /guides — the index of informational articles.
 *
 * Guides are static data (see lib/guides.ts), so this page and every article
 * are prerendered at build time and need no cache tag.
 */

export const metadata: Metadata = {
  title: "Hajj & Umrah Guides for Pilgrims from India",
  description:
    "Practical guides for Indian pilgrims planning Umrah and Hajj — documents, visas, vaccinations and preparation, checked against official Indian and Saudi sources.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Hajj & Umrah Guides | Mufti Travels",
    description:
      "Practical guides for Indian pilgrims planning Umrah and Hajj, checked against official sources.",
    type: "website",
  },
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GuidesIndexPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />

      <main className="min-h-screen bg-[#FAF8F5]">
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
              <span className="text-[#D4AF37]">Guides</span>
            </nav>
            <p className="mt-8 font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
              Before you travel
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Hajj &amp; Umrah Guides
            </h1>
            <p className="mt-6 max-w-3xl font-body text-sm leading-relaxed text-stone-300 sm:text-base">
              Clear answers to the questions pilgrims from India ask before they
              travel, checked against official Indian and Saudi government
              sources.
            </p>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-2xl"
              >
                <div className="relative h-56 w-full overflow-hidden bg-stone-900">
                  <Image
                    src={guide.image.src}
                    alt={guide.image.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/80 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#06131D]/85 px-3 py-1 text-xs font-medium text-[#F3E5AB]">
                    <FiClock className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {guide.readingMinutes} min read
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-body text-xs font-semibold uppercase tracking-wider text-[#997A15]">
                    {guide.eyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold leading-snug text-[#06131D] transition-colors group-hover:text-[#946E19]">
                    {guide.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 font-body text-sm leading-relaxed text-[#526168]">
                    {guide.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-6 font-body text-xs text-stone-500">
                    <span>Checked {formatDate(guide.reviewed)}</span>
                    <span className="flex items-center gap-1 font-semibold text-[#997A15]">
                      Read guide
                      <FiArrowRight className="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
