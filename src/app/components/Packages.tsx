"use client";

import Link from "next/link";
import { useState } from "react";
import { FaKaaba, FaHotel, FaMosque, FaMoon, FaStarAndCrescent } from "react-icons/fa";
import { FiArrowRight, FiPhoneCall } from "react-icons/fi";

import ManagedPackagesCatalog from "./ManagedPackagesCatalog";
import type { CmsPackageRecord } from "@/lib/packages";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";

const tabs = [
  {
    id: "Umrah Fixed Group",
    label: "Fixed Group (Air + Hotel)",
    icon: <FaKaaba />,
  },
  {
    id: "Umrah Land Package",
    label: "Land Packages (Hotel Only)",
    icon: <FaHotel />,
  },
  { id: "Ziyarat", label: "Umrah + Ziyarat Combos", icon: <FaMosque /> },
  { id: "Hajj", label: "Hajj", icon: <FaStarAndCrescent /> },
  { id: "Ramzan", label: "Ramadan Specials", icon: <FaMoon /> },
];

export default function Packages({
  packages,
  tiers,
  tags,
}: {
  packages: CmsPackageRecord[];
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
}) {
  const [activeTab, setActiveTab] = useState("Umrah Fixed Group");
  const activeLabel =
    tabs.find((tab) => tab.id === activeTab)?.label ?? activeTab;

  // Every card comes from the admin. A tab with nothing published says so
  // rather than showing placeholder packages with invented prices.
  const emptyTab = (
    <p className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center font-body text-sm text-stone-600">
      No {activeLabel} packages are published right now.{" "}
      <Link href="/#contact" className="font-semibold text-[#946E19] underline">
        Ask us what is coming
      </Link>
      .
    </p>
  );

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] relative overflow-hidden"
      id="packages"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Curated Pilgrimage Packages</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Select Your Sacred{" "}
            <span className="gold-gradient-text italic">Journey Plan</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            All packages feature 4★ & 5★ Haram-adjacent accommodation, authentic
            scholar guidance, verified visas, and dedicated Khadim care.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm ${
                activeTab === tab.id
                  ? "bg-[#06131D] text-[#F3E5AB] border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15"
                  : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
              }`}
            >
              <span
                className={
                  activeTab === tab.id ? "text-[#D4AF37]" : "text-stone-400"
                }
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <ManagedPackagesCatalog
            packages={packages.filter((item) => item.category === activeTab)}
            tiers={tiers}
            tags={tags}
            fallback={emptyTab}
          />
        </div>

        {/* Custom Package Consultation Banner */}
        <div className="mt-16 bg-[#06131D] text-white rounded-3xl p-8 sm:p-10 border border-[#D4AF37]/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs uppercase tracking-widest text-[#F3E5AB] font-semibold">
              Bespoke VIP Itineraries
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Need a Custom Dates or Family VIP Suite Package?
            </h3>
            <p className="text-stone-300 font-body text-sm sm:text-base max-w-2xl">
              We specialize in custom Haram-view suites, private GMC Yukon
              transfers, and personalized scholar accompaniment for private
              family groups.
            </p>
          </div>

          <a
            href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20customise%20a%20VIP%20Umrah%20package."
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-full font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-xl flex-shrink-0 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FiPhoneCall className="w-4 h-4" />
            <span>Customize with an Expert</span>
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
