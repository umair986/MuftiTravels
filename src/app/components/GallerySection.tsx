"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaKaaba, FaEye } from "react-icons/fa";
import { FiArrowRight, FiMapPin, FiX } from "react-icons/fi";

const galleryItems = [
  {
    id: 1,
    src: "/gallery/1.jpg",
    title: "The Holy Kaaba at Dawn",
    location: "Makkah Al-Mukarramah",
    desc: "Spiritual serenity during the early morning Tawaf.",
  },
  {
    id: 2,
    src: "/gallery/2.jpg",
    title: "Masjid An-Nabawi Courtyard",
    location: "Madinah Al-Munawwarah",
    desc: "The peaceful marble courtyard and iconic umbrellas.",
  },
  {
    id: 3,
    src: "/gallery/3.jpg",
    title: "Historic Mount Uhud",
    location: "Madinah Ziyarat",
    desc: "Visiting the sacred grounds of the Battle of Uhud.",
  },
  {
    id: 4,
    src: "/gallery/4.jpg",
    title: "Pilgrim Group Reflections",
    location: "Sacred Sites",
    desc: "Memorable brotherhood and sisterhood during guided Ziyarat.",
  },
];

export default function GallerySection() {
  const [selectedImage, setSelectedImage] = useState<(typeof galleryItems)[0] | null>(null);

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

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="relative h-80 rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-stone-200 hover:border-[#D4AF37]/60 hover:shadow-2xl transition-all duration-500"
            >
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* View Overlay Icon */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <FaEye className="w-4 h-4" />
              </div>

              {/* Bottom Captions */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <p className="text-[11px] uppercase tracking-wider text-[#F3E5AB] font-semibold flex items-center gap-1 mb-1">
                  <FiMapPin className="text-[#D4AF37] w-3 h-3" />
                  <span>{item.location}</span>
                </p>
                <h3 className="font-serif text-lg font-bold text-white group-hover:text-[#F3E5AB] transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-300 line-clamp-1 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-12 text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all"
          >
            <span>View Full Pilgrim Gallery</span>
            <FiArrowRight />
          </Link>
        </div>

      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#06131D] border border-[#D4AF37]/40 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 text-white hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <FiX className="w-6 h-6" />
            </button>

            <div className="relative h-[450px] sm:h-[550px] w-full">
              <Image
                src={selectedImage.src}
                alt={selectedImage.title}
                fill
                className="object-contain"
              />
            </div>

            <div className="p-6 bg-[#0B1E28] border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs text-[#F3E5AB] uppercase tracking-wider font-semibold">
                  {selectedImage.location}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                  {selectedImage.title}
                </h3>
                <p className="text-sm text-stone-300 mt-0.5">{selectedImage.desc}</p>
              </div>

              <a
                href="#contact"
                onClick={() => setSelectedImage(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-md whitespace-nowrap"
              >
                Plan Your Journey
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
