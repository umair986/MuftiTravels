"use client";

import { useRouter } from "next/navigation";
import { FiArrowRight, FiPercent, FiUsers, FiCalendar, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function Offers() {
  const router = useRouter();

  return (
    <section className="py-20 bg-[#FAF8F5] relative overflow-hidden" id="offers">
      {/* Background Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FiPercent className="w-3.5 h-3.5" />
            <span>Exclusive Seasonal Perks</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Offers to Inspire Your <span className="gold-gradient-text italic">Blessed Journey</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            Take advantage of special group concessions, family booking rates, and seasonal packages designed with extraordinary value.
          </p>
        </div>

        {/* 2 Feature Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Offer Card 1: 8+ Pilgrims Group Special */}
          <div className="bg-[#06131D] text-white rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/40 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold text-[#06131D] gold-gradient-bg shadow-sm">
                  Group Concession
                </span>
                <span className="text-xs font-semibold text-[#F3E5AB] flex items-center gap-1">
                  <FiUsers className="w-3.5 h-3.5 text-[#D4AF37]" /> 8+ Passengers
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                Special Rate for 8+ Family & Friends Group
              </h3>
              <p className="text-stone-300 font-body text-sm leading-relaxed mb-6">
                Traveling with extended family or community members? Enjoy dedicated private transport, interconnected hotel rooms, and exclusive discount per pilgrim.
              </p>

              {/* Perks List */}
              <div className="space-y-2 mb-6 text-xs text-stone-300">
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> Direct/Via Flights from Mumbai & Delhi
                </p>
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> Private AC Coach for Group Ziyarat
                </p>
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> Complimentary Dedicated Group Khadim
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Special Group Price</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-[#F3E5AB]">₹71,786</span>
                  <span className="text-xs text-stone-400">/ person</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/packages/umrah-fixed-group/mumbai")}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Book Group Package</span>
                <FiArrowRight />
              </button>
            </div>
          </div>

          {/* Offer Card 2: Ramadan 2025 Early Bird */}
          <div className="bg-gradient-to-br from-[#0D2A3A] to-[#0B1E28] text-white rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold text-white bg-emerald-700/90 border border-emerald-500/30">
                  Early Bird Slots
                </span>
                <span className="text-xs font-semibold text-[#F3E5AB] flex items-center gap-1">
                  <FiCalendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Ramadan 2025
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                Ramadan Mubarak 2025 Advance Registration
              </h3>
              <p className="text-stone-300 font-body text-sm leading-relaxed mb-6">
                Experience the spiritual zenith of Laylatul Qadr and Taraweeh prayers in the Two Holy Mosques. Secure guaranteed Clock Tower accommodations before peak price surges.
              </p>

              {/* Perks List */}
              <div className="space-y-2 mb-6 text-xs text-stone-300">
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> First 15 Days & Last 15 Days Options
                </p>
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> Daily Sahoor & Iftar Buffet Inclusions
                </p>
                <p className="flex items-center gap-2">
                  <FiCheck className="text-emerald-400" /> Guaranteed MoFA Ramadan Visa Quota
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Priority Booking</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-xl sm:text-2xl font-bold text-[#F3E5AB]">Custom Dates</span>
                  <span className="text-xs text-stone-400">available</span>
                </div>
              </div>

              <a
                href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20register%20early%20for%20Ramadan%202025%20Umrah."
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/20 border border-[#D4AF37]/30 flex items-center justify-center gap-2 transition-all"
              >
                <FaWhatsapp className="w-4 h-4 text-emerald-400" />
                <span>Reserve on WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
