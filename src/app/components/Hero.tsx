"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FiArrowRight,
  FiShield,
  FiStar,
  FiMapPin,
  FiCalendar,
  FiCompass,
} from "react-icons/fi";
import { FaWhatsapp, FaKaaba } from "react-icons/fa";
import CustomDropdown, { DropdownOption } from "./ui/CustomDropdown";
import { useRouter } from "next/navigation";

const cityOptions: DropdownOption[] = [
  {
    value: "Mumbai",
    label: "Mumbai",
    badge: "Direct Flights",
    sublabel: "Chhatrapati Shivaji Intl (BOM)",
  },
  {
    value: "Delhi",
    label: "Delhi",
    badge: "Direct Flights",
    sublabel: "Indira Gandhi Intl (DEL)",
  },
  {
    value: "Lucknow",
    label: "Lucknow",
    badge: "Direct Flights",
    sublabel: "Chaudhary Charan Singh (LKO)",
  },
  {
    value: "All India",
    label: "All India",
    badge: "Connecting",
    sublabel: "Bengaluru, Hyderabad, Calicut, etc.",
  },
];

const categoryOptions: DropdownOption[] = [
  {
    value: "Umrah Fixed Group",
    label: "15 Days Fixed Group",
    badge: "All Inclusive",
    sublabel: "Flights + 5★ Hotels + Buffet Meals",
  },
  {
    value: "Umrah Land Package",
    label: "Land Package (Hotel Only)",
    badge: "Flexible",
    sublabel: "14 to 30 Days stays in Haramain",
  },
  {
    value: "Ziyarat",
    label: "Umrah + Ziyarat Combos",
    badge: "Popular",
    sublabel: "Turkey / Dubai / Jerusalem Al-Aqsa",
  },
];

const seasonOptions: DropdownOption[] = [
  {
    value: "Upcoming",
    label: "Next Available Departures",
    badge: "Immediate",
    sublabel: "Fastest MoFA visa processing",
  },
  {
    value: "Ramadan Special",
    label: "Ramadan Special",
    badge: "Early Bird",
    sublabel: "First 15 / Last 15 Days & Laylatul Qadr",
  },
  {
    value: "Shawwal",
    label: "Shawwal / Post-Eid",
    badge: "Pleasant",
    sublabel: "Peaceful atmosphere after Ramadan",
  },
  {
    value: "Custom",
    label: "Custom Family Dates",
    badge: "VIP",
    sublabel: "Choose your own private schedule",
  },
];

export default function Hero() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [selectedType, setSelectedType] = useState("Umrah Fixed Group");
  const [selectedMonth, setSelectedMonth] = useState("Upcoming");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Carry the selections through instead of discarding them. The catalog
    // filters on city and category, and echoes the season back so nothing the
    // visitor chose disappears without explanation.
    const params = new URLSearchParams({
      city: selectedCity,
      category: selectedType,
      season: selectedMonth,
    });
    router.push(`/packages?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between bg-[#06131D] z-30">
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 flex-1 flex flex-col justify-center items-center text-center">
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
          Expertly curated Hajj, Umrah & Ziyarat packages. Experience luxury 5★
          hotels at the steps of the Haram, scholar-led spiritual guidance,
          direct flights, and 24/7 dedicated ground Khadim support.
        </p>

        {/* Dual Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none mb-12">
          <Link
            href="/packages"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm sm:text-base text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-xl shadow-[#D4AF37]/20 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Explore Packages</span>
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20consult%20for%20an%20Umrah%20package."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm sm:text-base text-white bg-white/10 hover:bg-white/15 border border-[#D4AF37]/40 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2.5"
          >
            <FaWhatsapp className="w-5 h-5 text-emerald-400" />
            <span>Instant WhatsApp Concierge</span>
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
                MoFA Certified
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
                10,000+ Pilgrims
              </p>
              <p className="text-stone-400 text-[11px] leading-tight">
                15+ Years Trust
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

      {/* Embedded Luxury Custom Pilgrimage Finder Bar at the base of Hero */}
      <div className="relative z-40 max-w-5xl mx-auto px-4 sm:px-6 w-full -mb-8 sm:-mb-10">
        <form
          onSubmit={handleQuickSearch}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-[#EBE5DC] flex flex-col md:flex-row items-center gap-4 text-left"
        >
          {/* Custom Departure City Dropdown */}
          <div className="flex-1 w-full border-b md:border-b-0 md:border-r border-stone-200 pb-3 md:pb-0 md:pr-4">
            <CustomDropdown
              label="Departure City"
              icon={<FiMapPin />}
              options={cityOptions}
              value={selectedCity}
              onChange={setSelectedCity}
            />
          </div>

          {/* Custom Package Category Dropdown */}
          <div className="flex-1 w-full border-b md:border-b-0 md:border-r border-stone-200 pb-3 md:pb-0 md:pr-4">
            <CustomDropdown
              label="Package Category"
              icon={<FaKaaba />}
              options={categoryOptions}
              value={selectedType}
              onChange={setSelectedType}
            />
          </div>

          {/* Custom Travel Season Dropdown with right alignment */}
          <div className="flex-1 w-full border-b md:border-b-0 md:border-r border-stone-200 pb-3 md:pb-0 md:pr-4">
            <CustomDropdown
              label="Travel Season"
              icon={<FiCalendar />}
              options={seasonOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              align="right"
            />
          </div>

          {/* Search Trigger Button */}
          <div className="w-full md:w-auto flex-shrink-0">
            <button
              type="submit"
              className="w-full md:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-[#06131D] gold-gradient-bg hover:brightness-105 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>View Packages</span>
              <FiArrowRight />
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Bottom Shadow Spacer */}
      <div className="h-12 bg-transparent" />
    </section>
  );
}
