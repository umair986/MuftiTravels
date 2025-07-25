"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaStar, FaArrowRight } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { PackageData, packageData, CategoryType, Badge } from "./packageData";

const tabs: CategoryType[] = [
  "Umrah Fixed Group",
  "Umrah Land Package",
  "Ziyarat",
];

export default function Packages() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CategoryType>("Umrah Fixed Group");

  const handleBookNow = (pkg: PackageData) => {
    const formattedCategory = activeTab
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    router.push(`/packages/${formattedCategory}/${pkg.slug}`);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50" id="packages">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#092638] mb-4">
            Our <span className="text-[#f8ac0d]">Packages</span>
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
          {tabs.map((tab: CategoryType) => (
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

        {/* Package Cards */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {packageData[activeTab].map((pkg: PackageData, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            >
              <div className="relative">
                <Image
                  src={pkg.image}
                  alt={pkg.name}
                  width={400}
                  height={250}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  {pkg.badges.map((badge: Badge, i: number) => (
                    <span
                      key={i}
                      className={`${badge.color} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm`}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1">
                    {Array(pkg.rating)
                      .fill(0)
                      .map((_, i: number) => (
                        <FaStar key={i} className="text-yellow-400" />
                      ))}
                  </div>
                  <span className="text-gray-500 text-sm">
                    ({pkg.reviews} Reviews)
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#092638] mb-4 flex-grow">
                  {pkg.name}
                </h3>

                <div className="flex justify-between items-center mt-auto">
                  <div>
                    <p className="text-sm text-gray-500">Starting From</p>
                    <p className="text-xl font-bold text-[#092638]">
                      {pkg.price}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBookNow(pkg)}
                    className="bg-[#f8ac0d] hover:bg-[#e59a00] text-white font-bold py-3 px-5 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    Book Now
                    <FaArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
