import Image from "next/image";
import { FiArrowRight, FiShield, FiStar, FiCompass } from "react-icons/fi";
import { FaWhatsapp, FaKaaba } from "react-icons/fa";
import { PILGRIMS_SERVED, yearsInService } from "@/lib/business";

/**
 * One job: get the visitor to a price. The primary button scrolls to the
 * departure-city cards directly below rather than leaving the page, and the
 * second offers WhatsApp for anyone who would rather ask than browse.
 *
 * A three-field search form used to sit at the base of the hero. It was
 * removed: its city field duplicated the city cards one scroll down, its
 * category and season fields filtered on choices the monthly catalogue does
 * not really offer, and on a phone it pushed the hero past one screen.
 */
export default function Hero() {
  return (
    <section className="relative lg:min-h-[80vh] flex flex-col justify-between bg-[#06131D] z-30">
      {/* Background Image with Cinematic Sacred Overlay - overflow contained inside this layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/Hero/hero4.png"
          alt="Masjid Al-Haram Makkah Mukarramah"
          fill
          priority
          className="object-cover object-center scale-105 animate-pulse-slow opacity-60"
        />
        {/* Radial Dark Obsidian Gradient for depth and legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/75 to-[#06131D]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#06131D]/60 to-[#06131D]" />
        {/* Subtle Sacred Geometry Pattern Overlay */}
        <div className="absolute inset-0 islamic-pattern-dark opacity-30" />
      </div>

      {/* Main Hero Body */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 sm:pt-16 sm:pb-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Sacred Bismillah Calligraphy Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/30 backdrop-blur-md mb-6 animate-float">
          <FaKaaba className="text-[#D4AF37] w-3.5 h-3.5" />
          <span className="font-arabic text-base sm:text-lg text-[#F3E5AB] tracking-wide">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          <span className="text-[11px] uppercase tracking-widest text-stone-300 font-semibold">
            Sacred Pilgrimages
          </span>
        </div>

        {/* Regal Display Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl mb-6">
          Hajj & Umrah Packages from India with{" "}
          <span className="gold-gradient-text block sm:inline italic">
            Devotion & Comfort
          </span>
        </h1>

        {/* Editorial Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-stone-300 font-normal max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 font-body">
          Monthly Umrah packages from Mumbai and across India — hotels near the
          Haram, scholar-led guidance, and our own team with you in Makkah &
          Madinah.
        </p>

        {/* Dual Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mb-10 sm:mb-12">
          <a
            href="#packages"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm sm:text-base text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-xl shadow-[#D4AF37]/20 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>See This Month&apos;s Packages</span>
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20consult%20for%20an%20Umrah%20package."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm sm:text-base text-white bg-white/10 hover:bg-white/15 border border-[#D4AF37]/40 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2.5"
          >
            <FaWhatsapp className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp for Today&apos;s Price</span>
          </a>
        </div>

        {/* Trust Badges Trio */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl w-full text-left">
          <div className="bg-[#0B1E28]/80 border border-[#D4AF37]/20 backdrop-blur-md rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 text-[#D4AF37]">
              <FaKaaba className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">
                50m to Haram
              </p>
              <p className="text-stone-400 text-[11px] leading-tight">
                Clock Tower & Markaziah
              </p>
            </div>
          </div>

          <div className="bg-[#0B1E28]/80 border border-[#D4AF37]/20 backdrop-blur-md rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">
                Govt. Certified
              </p>
              <p className="text-stone-400 text-[11px] leading-tight">
                Verified Umrah Visas
              </p>
            </div>
          </div>

          <div className="bg-[#0B1E28]/80 border border-[#D4AF37]/20 backdrop-blur-md rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 text-[#D4AF37]">
              <FiStar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">
                {PILGRIMS_SERVED} Pilgrims
              </p>
              <p className="text-stone-400 text-[11px] leading-tight">
                {yearsInService()}+ Years Trust
              </p>
            </div>
          </div>

          <div className="bg-[#0B1E28]/80 border border-[#D4AF37]/20 backdrop-blur-md rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400">
              <FiCompass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">
                Scholar Guidance
              </p>
              <p className="text-stone-400 text-[11px] leading-tight">
                Mutawwif On Ground
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
