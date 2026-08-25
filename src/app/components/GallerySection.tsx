import Image from "next/image";
import Link from "next/link";
import { FaKaaba } from "react-icons/fa";
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import type { GalleryCollectionWithCount } from "@/lib/gallery";

/**
 * Featured gallery collections on the home page.
 *
 * Which collections show here, and in what order, is controlled from
 * /admin/gallery ("Show on home"). Each tile links to the collection's own
 * page rather than opening a lightbox — the lightbox now lives on
 * /gallery/[slug], where a visitor can browse every photo in it.
 */
export default function GallerySection({
  collections,
}: {
  collections: GalleryCollectionWithCount[];
}) {
  if (!collections.length) return null;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] relative overflow-hidden" id="gallery">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Sacred Moments & Holy Sites</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Glimpses of the <span className="gold-gradient-text italic">Blessed Journey</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            Witness the awe-inspiring sights of the Two Holy Mosques and historic Ziyarat landmarks experienced by our pilgrims.
          </p>
        </div>

        {/* Featured collections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/gallery/${collection.slug}`}
              aria-label={`View the ${collection.title} collection`}
              className="relative h-80 w-full text-left rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-stone-200 hover:border-[#D4AF37]/60 hover:shadow-2xl transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
            >
              {collection.cover_image_url ? (
                <Image
                  src={collection.cover_image_url}
                  alt={collection.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="h-full w-full bg-[#0B1E28]" />
              )}
              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Bottom Captions */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                {collection.location && (
                  <p className="text-[11px] uppercase tracking-wider text-[#F3E5AB] font-semibold flex items-center gap-1 mb-1">
                    <FiMapPin className="text-[#D4AF37] w-3 h-3" />
                    <span>{collection.location}</span>
                  </p>
                )}
                <h3 className="font-display text-lg font-bold text-white group-hover:text-[#F3E5AB] transition-colors line-clamp-1">
                  {collection.title}
                </h3>
                <p className="text-xs text-stone-300 line-clamp-1 mt-0.5">
                  {collection.photo_count === 1
                    ? "1 photo"
                    : `${collection.photo_count} photos`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all"
          >
            <span>View the full gallery</span>
            <FiArrowRight />
          </Link>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 px-5 py-2.5 font-body text-sm font-semibold text-[#946E19] transition hover:border-[#D4AF37]"
          >
            Plan a journey like this
          </a>
        </div>

      </div>
    </section>
  );
}
