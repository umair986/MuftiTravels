"use client";

import Image from "next/image";
import { FiCheckCircle } from "react-icons/fi";
import { FaKaaba } from "react-icons/fa";
import { FOUNDED_YEAR, PILGRIMS_SERVED, yearsInService } from "@/lib/business";

export default function About() {
  const pillars = [
    {
      title: "Spiritual Sincerity (Ikhlas)",
      desc: "Every package is designed around authentic Sunnah rituals, accompanied by experienced Muftis and scholars for step-by-step guidance.",
    },
    {
      title: "Proximity to the Sacred Haram",
      desc: "We strictly select 4★ and 5★ hotels situated in Clock Tower and Markaziah to eliminate exhaustion for elderly pilgrims and families.",
    },
    {
      title: "Transparent, Honest Pricing",
      desc: "What you see is what you pay. Full inclusions: direct airfare, visa processing, verified accommodation, and hygienic Indian buffet catering.",
    },
    {
      title: "24/7 Ground Khadim Support",
      desc: "Our dedicated ground staff in Makkah & Madinah personally assist with luggage, check-in, Rawdah permits, and medical emergencies.",
    },
  ];

  return (
    <section className="w-full py-20 bg-[#FAF8F5] relative overflow-hidden" id="about">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Khadim Al-Hujjaj &bull; Servants of the Pilgrims</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            A Legacy of Devotion, Trust &{" "}
            <span className="gold-gradient-text italic">Spiritual Comfort</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            Since {FOUNDED_YEAR}, Mufti Travels has been dedicated to transforming the sacred pilgrimage into a tranquil, deeply memorable journey of a lifetime.
          </p>
        </div>

        {/* 2-Column Story & Showcase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image with Luxury Architectural Frame & Overlay Stats Card */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 group">
              <Image
                src="/about.jpg"
                alt="Pilgrims at Masjid Al-Haram with Mufti Travels"
                width={650}
                height={500}
                className="w-full h-[420px] sm:h-[480px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/80 via-transparent to-transparent" />
              
              {/* Bottom Badge inside image */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-xs uppercase tracking-widest text-[#F3E5AB] font-semibold">Our Sacred Promise</p>
                <p className="text-base sm:text-lg font-serif italic mt-0.5">
                  &ldquo;You focus solely on your Ibadah & prayers; we take care of every worldly detail.&rdquo;
                </p>
              </div>
            </div>

            {/* Floating Experience Badge */}
            <div className="absolute -bottom-6 -right-2 sm:-right-6 bg-[#06131D] text-white p-5 rounded-2xl border border-[#D4AF37]/40 shadow-2xl max-w-[220px] hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gold-gradient-bg flex items-center justify-center text-[#06131D] font-bold text-xl flex-shrink-0">
                  {yearsInService()}+
                </div>
                <div>
                  <p className="text-xs text-stone-400 font-medium">Years of</p>
                  <p className="text-sm font-bold text-white leading-tight">Excellence in Pilgrimage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Values & Pillars Grid */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="space-y-6">
              {pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm hover:border-[#D4AF37]/40 hover:shadow-md transition-all duration-300 flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-stone-200 flex items-center justify-center flex-shrink-0 text-[#946E19] group-hover:bg-[#D4AF37] group-hover:text-[#06131D] transition-colors">
                    <FiCheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#06131D] mb-1 group-hover:text-[#946E19] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed font-body">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Stat Strip */}
            <div className="mt-8 pt-6 border-t border-stone-200 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#06131D]">{PILGRIMS_SERVED}</p>
                <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-wider font-medium mt-0.5">Happy Pilgrims</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#946E19]">100%</p>
                <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-wider font-medium mt-0.5">Visa Success Rate</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#06131D]">4.9 / 5★</p>
                <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-wider font-medium mt-0.5">Google Rating</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
