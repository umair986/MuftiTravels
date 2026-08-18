"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaKaaba, FaHotel, FaMosque } from "react-icons/fa";
import { FiArrowRight, FiPhoneCall } from "react-icons/fi";

// Umrah Fixed Group Cards
import PackageCardMumbai from "./PackageCard/UmrahFixedGroup/PackageCardMumbai";
import PackageCardLucknow from "./PackageCard/UmrahFixedGroup/PackageCardLucknow";
import PackageCardDelhi from "./PackageCard/UmrahFixedGroup/PackageCardDelhi";

// Umrah Land Package Cards
import PackageCard14Days from "./PackageCard/UmrahLandPackage/PackageCard14Days";
import PackageCard30Days from "./PackageCard/UmrahLandPackage/PackageCard30Days";
import PackageCard25Days from "./PackageCard/UmrahLandPackage/PackageCard25Days";

// Ziyarat Card
import ZiyaratCard from "./PackageCard/Ziyarat/ZiyaratCard";

const tabs = [
  { id: "Umrah Fixed Group", label: "Fixed Group (Air + Hotel)", icon: <FaKaaba /> },
  { id: "Umrah Land Package", label: "Land Packages (Hotel Only)", icon: <FaHotel /> },
  { id: "Ziyarat", label: "Umrah + Ziyarat Combos", icon: <FaMosque /> },
];

export default function Packages() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Umrah Fixed Group");

  // Fixed Group handlers
  const handleBookNowMumbai = () => {
    router.push("/packages/umrah-fixed-group/mumbai");
  };
  const handleBookNowLucknow = () => {
    router.push("/packages/umrah-fixed-group/lucknow");
  };
  const handleBookNowDelhi = () => {
    router.push("/packages/umrah-fixed-group/delhi");
  };

  // Land Package handlers
  const handleBookNow14DaysLand = () => {
    router.push("/packages/umrah-land-package/14-days-umrah-land-package");
  };
  const handleBookNow30DaysLand = () => {
    router.push("/packages/umrah-land-package/30-days-super-saver-land-package");
  };
  const handleBookNow25DaysLand = () => {
    router.push("/packages/umrah-land-package/25-days-super-saver-land-package");
  };

  // Ziyarat handlers
  const handleBookNowZiyarat = (slug: string) => {
    router.push(`/packages/ziyarat/${slug}`);
  };

  const renderCards = () => {
    if (activeTab === "Umrah Fixed Group") {
      return (
        <>
          <PackageCardMumbai handleBookNow={handleBookNowMumbai} />
          <PackageCardLucknow handleBookNow={handleBookNowLucknow} />
          <PackageCardDelhi handleBookNow={handleBookNowDelhi} />
        </>
      );
    }
    if (activeTab === "Umrah Land Package") {
      return (
        <>
          <PackageCard14Days handleBookNow={handleBookNow14DaysLand} />
          <PackageCard30Days handleBookNow={handleBookNow30DaysLand} />
          <PackageCard25Days handleBookNow={handleBookNow25DaysLand} />
        </>
      );
    }
    if (activeTab === "Ziyarat") {
      return (
        <>
          <ZiyaratCard
            title="Umrah Plus Turkey Heritage Tour"
            image="/packages/package1.webp"
            price="₹2,30,786"
            days="18 Days / 17 Nights"
            destinations="Makkah • Madinah • Istanbul • Bursa"
            inclusions={["Umrah Visa", "Turkey E-Visa", "Bosphorus Cruise", "5★ Hotels"]}
            reviews={26}
            badgeText="Turkey Combo"
            handleBookNow={() => handleBookNowZiyarat("umrah-plus-turkey")}
          />
          <ZiyaratCard
            title="Umrah Plus Dubai Luxury City Break"
            image="/packages/package2.webp"
            price="₹1,49,786"
            days="16 Days / 15 Nights"
            destinations="Makkah • Madinah • Dubai Marina"
            inclusions={["Umrah Visa", "Dubai Visa", "Desert Safari", "4★/5★ Hotels"]}
            reviews={28}
            badgeText="Dubai Combo"
            handleBookNow={() => handleBookNowZiyarat("umrah-plus-dubai")}
          />
          <ZiyaratCard
            title="Umrah Plus Baitul Muqaddas (Al-Aqsa)"
            image="/packages/package3.webp"
            price="₹1,75,786"
            days="20 Days / 19 Nights"
            destinations="Makkah • Madinah • Jerusalem • Jordan"
            inclusions={["Masjid Al-Aqsa Visit", "Jordan Visa", "Historical Ziyarat", "VIP Transport"]}
            reviews={33}
            badgeText="3 Sacred Mosques"
            handleBookNow={() => handleBookNowZiyarat("umrah-plus-baitul-muqaddas")}
          />
        </>
      );
    }
    return null;
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] relative overflow-hidden" id="packages">
      {/* Background Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Curated Pilgrimage Packages 2025</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Select Your Sacred <span className="gold-gradient-text italic">Journey Plan</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            All packages feature 4★ & 5★ Haram-adjacent accommodation, authentic scholar guidance, MoFA verified visas, and dedicated Khadim care.
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
              <span className={activeTab === tab.id ? "text-[#D4AF37]" : "text-stone-400"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {renderCards()}
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
              We specialize in custom Haram-view suites, private GMC Yukon transfers, and personalized scholar accompaniment for private family groups.
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
