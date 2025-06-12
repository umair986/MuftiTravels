"use client";

import Image from "next/image";
import Link from "next/link";

export default function GallerySection() {
  const images = [1, 2, 3, 4];

  return (
    <section className="mt-20 px-4 md:px-12" id="gallery">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-[#092638]">Gallery</h2>
        <p className="text-[#f8ac0d] mt-1 text-sm">
          Explore moments from our journey
        </p>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, idx) => {
          const isLast = idx === images.length - 1;

          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl shadow-sm group hover:scale-[1.01] transition-transform duration-300"
            >
              <Image
                src={`/gallery/${img}.jpg`}
                alt={`Gallery ${img}`}
                width={500}
                height={500}
                className="object-cover w-full h-full"
              />
              {isLast && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Link
                    href="/gallery"
                    className="text-white text-lg font-semibold underline"
                  >
                    See More →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
