// "use client";

// import { useState } from "react";
// import { motion } from "framer-motion";
// import Image from "next/image";
// // import PackagePopup, { PackageData } from "./PackagePopup";
// import { FaStar } from "react-icons/fa";
// import { useRouter } from "next/navigation";
// import { packageData } from "./packageData";

// interface PackageDataType {
//   [key: string]: PackageData[];
// }

// const packageData: PackageDataType

// const tabs = ["Umrah Fixed Group", "Umrah Land Package", "Ziyarat"];

// // export default function Packages() {
// //   const [activeTab, setActiveTab] = useState("Umrah Fixed Group");
// //   const [showPopup, setShowPopup] = useState(false);
// //   const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(
// //     null
// //   );
// export default function Packages() {
//   const router = useRouter();
//   const [activeTab, setActiveTab] = useState("Umrah Fixed Group");

//   const handleBookNow = (pkg: PackageData, category: string) => {
//     const slug = pkg.name.toLowerCase().replace(/ /g, "-");
//     router.push(`/packages/${encodeURIComponent(category)}/${slug}`);
//   };

//   const handleBookNow = (pkg: PackageData) => {
//     setSelectedPackage(pkg);
//     setShowPopup(true);
//   };

//   return (
//     <section className="py-12 px-2 sm:px-4 bg-gray-50" id="packages">
//       <div className="max-w-7xl mx-auto">
//         <div className="text-center mb-10 sm:mb-12">
//           <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#092638] mb-4">
//             Our <span className="text-[#f8ac0d]">Packages</span>
//           </h2>
//         </div>

//         {/* Tab Navigation */}
//         <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
//           {tabs.map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 ${
//                 activeTab === tab
//                   ? "bg-[#f8ac0d] text-white shadow-lg"
//                   : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
//               }`}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>

//         {/* Package Cards */}
//         <motion.div
//           key={activeTab}
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//           className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
//         >
//           {packageData[activeTab].map((pkg, index) => (
//             <motion.div
//               key={index}
//               initial={{ opacity: 0, y: 30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.6, delay: index * 0.1 }}
//               className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
//             >
//               <div className="relative">
//                 <Image
//                   src={pkg.image}
//                   alt={pkg.name}
//                   width={400}
//                   height={250}
//                   className="w-full h-48 object-cover"
//                 />
//                 <div className="absolute top-4 left-4 flex flex-col gap-2">
//                   {pkg.badges.map((badge, i) => (
//                     <span
//                       key={i}
//                       className={`${badge.color} text-white px-3 py-1 rounded-full text-xs sm:text-sm font-medium shadow`}
//                     >
//                       {badge.text}
//                     </span>
//                   ))}
//                 </div>
//               </div>

//               <div className="p-4 sm:p-6 flex flex-col flex-1">
//                 <div className="flex items-center gap-2 mb-2">
//                   <span className="text-gray-500 text-xs sm:text-sm">
//                     ({pkg.reviews} Reviews)
//                   </span>
//                   <div className="flex gap-1">
//                     {Array(pkg.rating)
//                       .fill(0)
//                       .map((_, i) => (
//                         <FaStar
//                           key={i}
//                           className="text-yellow-400 text-xs sm:text-sm"
//                         />
//                       ))}
//                   </div>
//                 </div>

//                 <h3 className="text-lg sm:text-xl font-bold text-[#092638] mb-4">
//                   {pkg.name}
//                 </h3>

//                 <div className="mb-4">
//                   <div className="flex items-center gap-2">
//                     <span className="text-gray-500 text-xs sm:text-sm">
//                       Starting From
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <span className="text-xl sm:text-2xl font-bold text-[#f8ac0d]">
//                       {pkg.price}
//                     </span>
//                     {pkg.originalPrice && (
//                       <span className="text-gray-400 line-through text-xs sm:text-sm">
//                         {pkg.originalPrice}
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 <button
//       onClick={() => handleBookNow(pkg, activeTab)}
//       className="mt-auto w-full bg-[#f8ac0d] hover:bg-[#e59a00] text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
//     >
//       Book Now
//       <svg
//         className="w-4 h-4"
//         fill="none"
//         stroke="currentColor"
//         viewBox="0 0 24 24"
//       >
//         <path
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           strokeWidth={2}
//           d="M9 5l7 7-7 7"
//         />
//       </svg>
//     </button>
//               </div>
//             </motion.div>
//           ))}
//         </motion.div>
//       </div>

//       {/* Popup Component */}
//       {showPopup && selectedPackage && (
//         <PackagePopup
//           onClose={() => setShowPopup(false)}
//           packageData={selectedPackage}
//         />
//       )}
//     </section>
//   );
// }

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaStar } from "react-icons/fa";
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

  const handleBookNow = (pkg: PackageData, category: CategoryType): void => {
    const formattedCategory = category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    console.log("Debug:", {
      category,
      formattedCategory,
      slug: pkg.slug,
      url: `/packages/${formattedCategory}/${pkg.slug}`,
    });
    router.push(`/packages/${formattedCategory}/${pkg.slug}`);
  };

  return (
    <section className="py-12 px-2 sm:px-4 bg-gray-50" id="packages">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#092638] mb-4">
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
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
              <div className="relative">
                <Image
                  src={pkg.image}
                  alt={pkg.name}
                  width={400}
                  height={250}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {pkg.badges.map((badge: Badge, i: number) => (
                    <span
                      key={i}
                      className={`${badge.color} text-white px-3 py-1 rounded-full text-xs sm:text-sm font-medium shadow`}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-500 text-xs sm:text-sm">
                    ({pkg.reviews} Reviews)
                  </span>
                  <div className="flex gap-1">
                    {Array(pkg.rating)
                      .fill(0)
                      .map((_, i: number) => (
                        <FaStar
                          key={i}
                          className="text-yellow-400 text-xs sm:text-sm"
                        />
                      ))}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#092638] mb-4">
                  {pkg.name}
                </h3>

                {/* Features Grid */}
                <div className="grid grid-cols-1 gap-2 mb-4">
                  {pkg.features.map((feature: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-gray-700 text-sm"
                    >
                      <span className="w-1.5 h-1.5 bg-[#f8ac0d] rounded-full" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs sm:text-sm">
                      Starting From
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-[#f8ac0d]">
                      {pkg.price}
                    </span>
                    {pkg.originalPrice && (
                      <span className="text-gray-400 line-through text-xs sm:text-sm">
                        {pkg.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleBookNow(pkg, activeTab)}
                  className="mt-auto w-full bg-[#f8ac0d] hover:bg-[#e59a00] text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  Book Now
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
