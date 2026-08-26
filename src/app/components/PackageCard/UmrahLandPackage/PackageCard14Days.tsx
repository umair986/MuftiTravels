"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FiClock, FiMapPin, FiArrowRight, FiStar } from "react-icons/fi";
import { FaHotel, FaBus, FaShieldAlt } from "react-icons/fa";

export default function PackageCard14Days({
  handleBookNow,
}: {
  handleBookNow: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:border-[#D4AF37]/50 hover:shadow-2xl transition-all duration-300 flex flex-col group"
    >
      <div className="relative h-60 w-full overflow-hidden bg-stone-900">
        <Image
          src="/packages/package1.webp"
          alt="14 Days Umrah Land Package"
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/80 via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-amber-700/90 backdrop-blur-md shadow-sm border border-amber-500/30">
            Land Only Package
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-[#06131D] gold-gradient-bg shadow-sm">
            Popular
          </span>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06131D]/85 backdrop-blur-md text-[#F3E5AB] text-xs font-medium border border-[#D4AF37]/30">
          <FiMapPin className="text-[#D4AF37] w-3.5 h-3.5" />
          <span>Makkah & Madinah Hotels</span>
        </div>

        <div className="absolute bottom-3 right-3 text-white text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm flex items-center gap-1">
          <FiClock className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>14 Days / 13 Nights</span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-xs font-bold text-stone-800 ml-1">5.0</span>
              <span className="text-xs text-stone-500">(35 reviews)</span>
            </div>
            <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              Flexible Dates
            </span>
          </div>

          <h3 className="font-serif text-xl font-bold text-[#06131D] group-hover:text-[#946E19] transition-colors line-clamp-1 mb-3">
            14 Days Umrah Land Package
          </h3>

          <div className="grid grid-cols-2 gap-2 py-3 border-y border-stone-100 text-xs text-stone-600 mb-4">
            <span className="flex items-center gap-1.5 font-medium">
              <FaHotel className="text-[#D4AF37] w-3 h-3" /> Hotel Stays
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FaBus className="text-[#D4AF37] w-3 h-3" /> Ground Transport
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FaShieldAlt className="text-[#D4AF37] w-3 h-3" /> Visa Included
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FiClock className="text-[#D4AF37] w-3 h-3" /> 24/7 Assistance
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Starting From</p>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-[#06131D]">₹60,786</span>
              <span className="text-xs text-stone-500">/ person</span>
            </div>
          </div>

          <button
            onClick={handleBookNow}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Book Now</span>
            <FiArrowRight />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
