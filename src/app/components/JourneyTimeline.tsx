"use client";

import React, { useState } from "react";
import { FaKaaba, FaPlaneDeparture, FaMosque, FaHandsHelping, FaAward } from "react-icons/fa";
import { FiCheck, FiArrowRight } from "react-icons/fi";

export default function JourneyTimeline() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: "01",
      icon: <FaPlaneDeparture className="w-5 h-5 text-[#D4AF37]" />,
      title: "Preparation & Spiritual Orientation",
      location: "India Departure (Mumbai / Delhi / Lucknow)",
      desc: "Prior to departure, receive comprehensive visa documentation, insurance, and attend our exclusive Scholar-led Umrah & Ihram orientation seminar with complimentary guide kit.",
      highlights: ["Official Umrah Visa", "Ihram Kit & Du'a Booklet", "Baggage & Flight Tags"],
    },
    {
      number: "02",
      icon: <FaHandsHelping className="w-5 h-5 text-[#D4AF37]" />,
      title: "VIP Ground Reception & Transfer",
      location: "Jeddah / Madinah Airport",
      desc: "Warmly welcomed at King Abdulaziz Airport by our multilingual Saudi team. Seamless luxury private coach transfer directly to your 5-star hotel adjacent to the Haram.",
      highlights: ["Zero Waiting Time", "Luggage Concierge to Room", "Smooth Express Check-in"],
    },
    {
      number: "03",
      icon: <FaKaaba className="w-5 h-5 text-[#D4AF37]" />,
      title: "Guided Rituals of Umrah",
      location: "Masjid Al-Haram, Makkah",
      desc: "Accompanied by our certified Mutawwif, perform the sacred Tawaf, Maqam Ibrahim prayers, drink Zamzam, and complete Sa'i between Safa and Marwah with complete spiritual peace.",
      highlights: ["Step-by-step scholar guidance", "Wheelchair assistance available", "24/7 Haram support"],
    },
    {
      number: "04",
      icon: <FaMosque className="w-5 h-5 text-[#D4AF37]" />,
      title: "Sacred Ziyarat & Rawdah Visit",
      location: "Makkah Mukarramah & Madinah Munawwarah",
      desc: "Explore historic Islamic landmarks: Jabal al-Noor (Cave of Hira), Mount Arafat, Masjid Quba, Mount Uhud, and guaranteed scheduled entry to the Blessed Rawdah Sharif (Riyazul Jannah).",
      highlights: ["Nusuk App permit handling", "Air-conditioned tour coach", "Historical talks by Mufti"],
    },
    {
      number: "05",
      icon: <FaAward className="w-5 h-5 text-[#D4AF37]" />,
      title: "Zamzam Packaging & Blessed Return",
      location: "Homeward Bound with Accepted Du'as",
      desc: "We ensure 5 Litres of sealed pure Zamzam water per pilgrim, hassle-free airport transfer, and complete check-in assistance for your safe return to your loved ones.",
      highlights: ["5L Zamzam Water Included", "Assisted Airport Boarding", "Lifelong Memories & Du'as"],
    },
  ];

  return (
    <section className="py-20 bg-[#06131D] text-white relative overflow-hidden" id="journey">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 islamic-pattern-dark opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/30 text-[#F3E5AB] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>The Sacred Path</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            The 5 Blessed Stages of{" "}
            <span className="gold-gradient-text italic">Your Pilgrimage</span>
          </h2>
          <p className="text-stone-300 font-body text-base sm:text-lg leading-relaxed">
            From the moment you intend (Niyyah) in India to performing your final Tawaf, experience how Mufti Travels cares for every step of your spiritual journey.
          </p>
        </div>

        {/* Step Tabs Navigation - Smooth Horizontal Swipe on Mobile, 5-col Grid on Desktop */}
        <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto pb-4 sm:pb-0 gap-2.5 sm:gap-4 mb-10 sm:mb-12 no-scrollbar [scrollbar-width:none]">
          {steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`min-w-[160px] sm:min-w-0 flex-shrink-0 sm:flex-shrink p-3.5 rounded-2xl text-left transition-all duration-300 border flex flex-col justify-between cursor-pointer ${
                activeStep === idx
                  ? "bg-[#0D2A3A] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15"
                  : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold font-mono ${activeStep === idx ? "text-[#D4AF37]" : "text-stone-400"}`}>
                  {step.number}
                </span>
                <div className={`p-1.5 rounded-lg ${activeStep === idx ? "bg-[#D4AF37]/20" : "bg-white/5"}`}>
                  {step.icon}
                </div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                {step.title}
              </p>
            </button>
          ))}
        </div>

        {/* Active Stage Highlight Card */}
        <div className="bg-[#0B1E28] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold gold-gradient-bg text-[#06131D]">
                  STAGE {steps[activeStep].number}
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  {steps[activeStep].location}
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {steps[activeStep].title}
              </h3>

              <p className="text-stone-300 font-body text-base sm:text-lg leading-relaxed">
                {steps[activeStep].desc}
              </p>

              {/* Highlights Chips */}
              <div className="pt-4 flex flex-wrap gap-2 sm:gap-3">
                {steps[activeStep].highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/20 text-xs sm:text-sm text-stone-200 font-medium"
                  >
                    <FiCheck className="text-emerald-400 w-3.5 h-3.5" />
                    <span>{h}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right Side: Quick Action CTA */}
            <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-center text-center">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold mb-2">
                Personalized Care
              </p>
              <h4 className="font-serif text-lg font-bold text-white mb-4">
                Have questions about this stage?
              </h4>
              <p className="text-xs text-stone-300 mb-6 leading-relaxed">
                Our scholar guides are available to walk you through every dua and step in detail.
              </p>
              <a
                href="#contact"
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Speak with an Advisor</span>
                <FiArrowRight />
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
