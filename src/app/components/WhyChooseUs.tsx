"use client";

import { motion } from "framer-motion";
import { FaKaaba, FaUtensils, FaUserGraduate, FaShieldAlt, FaHandsHelping } from "react-icons/fa";
import { FiCheck, FiArrowRight } from "react-icons/fi";

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-[#FAF8F5] relative overflow-hidden" id="why-us">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>The Mufti Travels Standard</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Why Discerning Pilgrims Choose{" "}
            <span className="gold-gradient-text italic">Mufti Travels</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            We don&apos;t treat this as a commercial tour. To us, every traveler is a guest of Allah (Duyoof ar-Rahman), deserving of absolute reverence and world-class care.
          </p>
        </div>

        {/* Bento Grid Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Bento Card 1: Featured Major Card (Span 2 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 lg:col-span-2 bg-[#06131D] text-white rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl gold-gradient-bg flex items-center justify-center text-[#06131D] mb-6 shadow-lg shadow-[#D4AF37]/20">
                <FaKaaba className="w-6 h-6" />
              </div>
              <span className="text-xs uppercase tracking-widest text-[#F3E5AB] font-semibold">
                Uncompromising Proximity
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">
                Hotels Right at the Steps of the Haram
              </h3>
              <p className="text-stone-300 font-body text-sm sm:text-base leading-relaxed mb-6">
                Say goodbye to crowded shuttle buses and 2-kilometer walks in the desert heat. Our premium packages feature renowned 5-star properties in Clock Tower (Makkah) and Markaziah (Madinah) located just 50 to 150 meters from the courtyard.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <FiCheck className="text-emerald-400" /> Walking Distance (0-3 mins)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <FiCheck className="text-emerald-400" /> Ideal for Elderly & Families
              </span>
            </div>
          </motion.div>

          {/* Bento Card 2: Scholar-Led Guidance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm hover:border-[#D4AF37]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#06131D] text-[#D4AF37] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <FaUserGraduate className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Authentic Sunnah
              </span>
              <h3 className="font-serif text-xl font-bold text-[#06131D] mt-1 mb-2">
                Scholar-Led Guidance
              </h3>
              <p className="text-stone-600 font-body text-sm leading-relaxed">
                Experienced Muftis accompany our groups to clarify all Fiqh of Umrah, answer queries, and lead insightful historical talks at Ziyarat sites.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-semibold text-[#946E19]">
              <span>Step-by-step Mutawwif</span>
              <FiCheck />
            </div>
          </motion.div>

          {/* Bento Card 3: Indian Buffet Catering */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm hover:border-[#D4AF37]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <FaUtensils className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Comfort Food
              </span>
              <h3 className="font-serif text-xl font-bold text-[#06131D] mt-1 mb-2">
                Hygienic Indian Meals
              </h3>
              <p className="text-stone-600 font-body text-sm leading-relaxed">
                Enjoy 3 fresh daily meals (Breakfast, Lunch & Dinner) prepared by authentic Indian chefs — offering balanced, tasty, and familiar nourishment.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-semibold text-[#946E19]">
              <span>Buffet Style &bull; Pure Halal</span>
              <FiCheck />
            </div>
          </motion.div>

          {/* Bento Card 4: Verified Visas & Insurance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm hover:border-[#D4AF37]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <FaShieldAlt className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                Official Authorization
              </span>
              <h3 className="font-serif text-xl font-bold text-[#06131D] mt-1 mb-2">
                Visa & Insurance Verified
              </h3>
              <p className="text-stone-600 font-body text-sm leading-relaxed">
                Direct integration with official visa processing ensures fast Umrah visa stamping and mandatory medical health coverage.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <span>100% Visa Approval Track</span>
              <FiCheck />
            </div>
          </motion.div>

          {/* Bento Card 5: 24/7 Dedicated Ground Khadims (Span 2 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-[#0D2A3A] to-[#06131D] text-white rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
                <FaHandsHelping className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#F3E5AB] font-semibold">
                  Personalized Khidmah
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-1 mb-1">
                  24/7 On-Ground Khadim Support in Saudi Arabia
                </h3>
                <p className="text-stone-300 font-body text-sm leading-relaxed max-w-2xl">
                  You are never alone. Our resident Arabic & Urdu-speaking team handles airport transfers, hotel check-ins, medical needs, and wheelchair assistance.
                </p>
              </div>
            </div>

            <a
              href="#contact"
              className="px-6 py-3 rounded-full font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-md flex-shrink-0 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>Consult Our Team</span>
              <FiArrowRight />
            </a>
          </motion.div>

        </div>

      </div>
    </section>
  );
};

export default WhyChooseUs;
