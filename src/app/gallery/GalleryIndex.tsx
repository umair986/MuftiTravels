"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaKaaba } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";
import type { GalleryCollectionWithCount } from "@/lib/gallery";

/** Every 5th tile after the wide opener spans two columns, for rhythm. */
function tileSpan(index: number): string {
  if (index === 0) return "lg:col-span-2 lg:row-span-2";
  if (index % 5 === 0) return "lg:col-span-2";
  return "";
}

export default function GalleryIndex({
  collections,
}: {
  collections: GalleryCollectionWithCount[];
}) {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div className="islamic-pattern pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#946E19]">
            <FaKaaba className="h-3.5 w-3.5" />
            <span>The Full Gallery</span>
          </div>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight text-[#06131D] sm:text-4xl md:text-5xl">
            Every <span className="gold-gradient-text italic">Blessed Collection</span>
          </h1>
          <p className="font-body text-base leading-relaxed text-stone-600 sm:text-lg">
            Photos from the Two Holy Mosques, historic Ziyarat landmarks and our
            pilgrim groups, organised by place. Open a collection to see every
            photo.
          </p>
        </div>

        {collections.length ? (
          <div className="grid auto-rows-[240px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection, index) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(index, 4) * 0.08 }}
                className={tileSpan(index)}
              >
                <Link
                  href={`/gallery/${collection.slug}`}
                  aria-label={`View the ${collection.title} collection, ${collection.photo_count} photos`}
                  className="group relative block h-full w-full overflow-hidden rounded-3xl border border-stone-200 shadow-md transition-all duration-500 hover:border-[#D4AF37]/60 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
                >
                  {collection.cover_image_url ? (
                    <Image
                      src={collection.cover_image_url}
                      alt={collection.title}
                      fill
                      sizes={
                        index === 0
                          ? "(min-width: 1024px) 66vw, 100vw"
                          : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      }
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#0B1E28]" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/40 to-transparent opacity-85 transition-opacity group-hover:opacity-95" />

                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
                    {collection.location && (
                      <p className="mb-1 flex items-center gap-1 font-body text-[11px] font-semibold uppercase tracking-wider text-[#F3E5AB]">
                        <FiMapPin className="h-3 w-3 text-[#D4AF37]" />
                        <span>{collection.location}</span>
                      </p>
                    )}
                    <h2 className="font-display text-xl font-bold text-white transition-colors group-hover:text-[#F3E5AB] sm:text-2xl">
                      {collection.title}
                    </h2>
                    <p className="mt-1 font-body text-xs text-stone-300">
                      {collection.photo_count === 1
                        ? "1 photo"
                        : `${collection.photo_count} photos`}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#D4AF37]/40 bg-white/50 p-10 text-center font-body text-sm text-[#526168]">
            The gallery is being prepared — check back soon.
          </p>
        )}
      </div>
    </section>
  );
}
