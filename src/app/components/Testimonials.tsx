"use client";

import Image from "next/image";
import { FaStar, FaKaaba } from "react-icons/fa";
import { FiCheck, FiMapPin } from "react-icons/fi";

const testimonials = [
  {
    name: "Haji Ahmed Khan",
    city: "Mumbai, Maharashtra",
    category: "Family Group (8 Members)",
    avatar: "/testimonials/Mavatar.png",
    text: "Mufti Travels made our family Umrah completely effortless. With my elderly parents, having our hotel just 50 meters from Clock Tower meant they could pray all 5 Salah in the Haram without fatigue.",
    package: "15 Days Mumbai Fixed Group",
  },
  {
    name: "Fatima Begum",
    city: "Lucknow, UP",
    category: "Elderly Couple Umrah",
    avatar: "/testimonials/favatar.png",
    text: "Truly spiritual and stress-free. The scholar accompanying our group explained the historical significance of every Ziyarat site in Makkah and Madinah with such beauty and depth.",
    package: "15 Days Lucknow Fixed Group",
  },
  {
    name: "Imran Sheikh",
    city: "Delhi NCR",
    category: "Ramadan Special Group",
    avatar: "/testimonials/Mavatar.png",
    text: "From airport clearance in Jeddah to the delicious Indian buffet meals served three times a day, everything exceeded what was promised. 10/10 recommend Mufti Travels.",
    package: "15 Days Delhi Fixed Group",
  },
  {
    name: "Zainab Patel",
    city: "Mumbai, Maharashtra",
    category: "Solo Pilgrim",
    avatar: "/testimonials/favatar.png",
    text: "As a solo traveler, I felt completely safe, respected, and supported by the on-ground Khadims. The Rawdah permit was pre-arranged seamlessly on Nusuk without any wait.",
    package: "14 Days Umrah Land Package",
  },
  {
    name: "Dr. Yusuf Ali",
    city: "Bengaluru, Karnataka",
    category: "VIP Suite Package",
    avatar: "/testimonials/Mavatar.png",
    text: "The attention to detail and transparency in pricing is what sets Mufti Travels apart. No hidden fees, luxury private GMC transfers, and extraordinary hospitality.",
    package: "Umrah Plus Turkey Heritage",
  },
];

const TestimonialCard = ({
  name,
  city,
  category,
  avatar,
  text,
  package: pkgName,
}: (typeof testimonials)[0]) => (
  <li className="w-84 sm:w-96 flex-shrink-0">
    <div className="flex flex-col h-full bg-white p-6 sm:p-7 rounded-3xl shadow-lg border border-stone-200 hover:border-[#D4AF37]/50 transition-all duration-300">
      
      {/* Top Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-1 text-amber-400">
          {[...Array(5)].map((_, i) => (
            <FaStar key={i} className="w-3.5 h-3.5" />
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <FiCheck className="w-3 h-3" /> Verified Pilgrim
        </span>
      </div>

      {/* Quote */}
      <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-6 flex-grow font-body italic">
        &ldquo;{text}&rdquo;
      </p>

      {/* Package Tag */}
      <div className="text-[11px] font-medium text-[#946E19] bg-[#FAF8F5] px-3 py-1 rounded-lg border border-stone-200/80 mb-4 inline-block">
        {pkgName}
      </div>

      {/* Pilgrim Profile */}
      <div className="flex items-center pt-3 border-t border-stone-100">
        <Image
          src={avatar}
          alt={name}
          width={48}
          height={48}
          className="rounded-full object-cover mr-3.5 border-2 border-[#D4AF37]/40"
        />
        <div>
          <h4 className="font-serif font-bold text-[#06131D] text-base">{name}</h4>
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <FiMapPin className="text-[#D4AF37] w-3 h-3" />
            <span>{city}</span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-stone-400">{category}</span>
          </p>
        </div>
      </div>

    </div>
  </li>
);

export default function Testimonials() {
  return (
    <>
      <style jsx global>{`
        @keyframes testimonialScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonial-stream {
            animation: none !important;
          }
        }
      `}</style>

      <section className="py-20 bg-[#FAF8F5] relative overflow-hidden" id="testimonials">
        <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Pilgrim Reflections & Du&apos;as</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Trusted by Thousands of <span className="gold-gradient-text italic">Blessed Pilgrims</span>
          </h2>
          <p className="mt-2 max-w-2xl mx-auto text-base sm:text-lg text-stone-600 font-body">
            Read heartfelt experiences from families, elders, and solo travelers who completed their sacred journey with us.
          </p>
        </div>

        {/* Continuous Smooth Testimonial Stream */}
        <div className="group relative w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <ul className="testimonial-stream flex w-max items-stretch gap-6 sm:gap-8 py-4 animate-[testimonialScroll_45s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <TestimonialCard
                key={`${testimonial.name}-${index}`}
                {...testimonial}
              />
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
