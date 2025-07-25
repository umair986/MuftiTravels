"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Umrah Fixed Group Cards
import PackageCardMumbai from "./PackageCard/UmrahFixedGroup/PackageCardMumbai";
import PackageCardLucknow from "./PackageCard/UmrahFixedGroup/PackageCardLucknow";
import PackageCardDelhi from "./PackageCard/UmrahFixedGroup/PackageCardDelhi";

// Umrah Land Package Cards
import PackageCard14Days from "./PackageCard/UmrahLandPackage/PackageCard14Days";
import PackageCard30Days from "./PackageCard/UmrahLandPackage/PackageCard30Days";
import PackageCard25Days from "./PackageCard/UmrahLandPackage/PackageCard25Days";

const tabs = ["Umrah Fixed Group", "Umrah Land Package", "Ziyarat"];

export default function Packages() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Umrah Fixed Group");

  // --- CORRECTED: Handlers now point to the new dedicated pages ---
  const handleBookNowMumbai = () => {
    router.push("/packages/umrah-fixed-group/mumbai");
  };
  const handleBookNowLucknow = () => {
    router.push("/packages/umrah-fixed-group/lucknow");
  };
  const handleBookNowDelhi = () => {
    router.push("/packages/umrah-fixed-group/delhi");
  };

  // --- Handlers for Umrah Land Package (These still use the dynamic slug pages) ---
  const handleBookNow14DaysLand = () => {
    router.push("/packages/umrah-land-package/14-days-umrah-land-package");
  };
  const handleBookNow30DaysLand = () => {
    router.push(
      "/packages/umrah-land-package/30-days-super-saver-land-package"
    );
  };
  const handleBookNow25DaysLand = () => {
    router.push(
      "/packages/umrah-land-package/25-days-super-saver-land-package"
    );
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
    // Fallback for other tabs
    return (
      <p className="text-center text-gray-500 col-span-1 sm:col-span-2 lg:col-span-3">
        No packages available for this category.
      </p>
    );
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50" id="packages">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#092638] mb-4">
            Our <span className="text-[#f8ac0d]">Packages</span>
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 ${
                activeTab === tab
                  ? "bg-[#f8ac0d] text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {renderCards()}
        </div>
      </div>
    </section>
  );
}
