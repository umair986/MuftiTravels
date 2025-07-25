"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaStar,
  FaShareAlt,
  FaPlane,
  FaUtensils,
  FaPassport,
} from "react-icons/fa";
import { motion } from "framer-motion";
import {
  PackageData,
  packageData,
  CategoryType,
} from "../../../components/packageData"; // Adjust path if needed

// Helper to map URL-friendly slugs back to the data keys
const categorySlugMap: Record<string, CategoryType> = {
  "umrah-fixed-group": "Umrah Fixed Group",
  "umrah-land-package": "Umrah Land Package",
  ziyarat: "Ziyarat",
};

export default function PackageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [categoryName, setCategoryName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    if (params.category && params.slug) {
      try {
        const categorySlug = Array.isArray(params.category)
          ? params.category[0]
          : params.category;
        const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

        // Use the map to find the correct category key
        const categoryKey = categorySlugMap[categorySlug];

        if (!categoryKey || !packageData[categoryKey]) {
          console.error("Invalid category:", categorySlug);
          router.push("/404");
          return;
        }

        const foundPackage = packageData[categoryKey].find(
          (p) => p.slug === slug
        );

        if (!foundPackage) {
          console.error("Package not found for slug:", slug);
          router.push("/404");
          return;
        }

        setPkg(foundPackage);
        setCategoryName(categoryKey);
      } catch (error) {
        console.error("Error loading package:", error);
        router.push("/404");
      } finally {
        setIsLoading(false);
      }
    }
  }, [params, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#f8ac0d]"></div>
      </div>
    );
  }

  if (!pkg) {
    // This will be handled by the redirect, but as a fallback
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center text-center">
        <div>
          <h1 className="text-3xl font-bold text-[#092638]">
            Package Not Found
          </h1>
          <p className="text-gray-600 mt-2">
            The package you are looking for does not exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 bg-[#f8ac0d] text-white py-2 px-4 rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    "Overview",
    "Itinerary",
    "Hotels",
    "Tour Cost",
    "Includes/Excludes",
    "Policies",
  ];

  return (
    <div className="bg-[#f7f9fc] min-h-screen font-sans">
      <div
        className="h-64 md:h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${pkg.image})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-white text-4xl md:text-5xl font-bold tracking-tight">
              {pkg.name}
            </h1>
            <p className="text-gray-300 mt-2 text-sm">
              Home » {categoryName} »{" "}
              <span className="text-white font-semibold">Package Details</span>
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-20">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#092638]">{pkg.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-1">
                  {Array(pkg.rating)
                    .fill(0)
                    .map((_, i) => (
                      <FaStar key={i} className="text-yellow-400" />
                    ))}
                  <span className="ml-1">({pkg.reviews} reviews)</span>
                </div>
              </div>
            </div>
            <button className="mt-4 md:mt-0 flex items-center gap-2 bg-[#f8ac0d] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#e59a00] transition-all">
              <FaShareAlt />
              <span>Share Package</span>
            </button>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-b border-gray-200 py-6 mb-8">
            <div className="text-center">
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-semibold text-[#092638]">
                {categoryName.split(" ")[0]}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Package Type</p>
              <p className="font-semibold text-[#092638]">Silver</p>{" "}
              {/* Placeholder */}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Sharing Type</p>
              <p className="font-semibold text-[#092638]">Double</p>{" "}
              {/* Placeholder */}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Current Price</p>
              <p className="font-bold text-lg text-[#f8ac0d]">
                {pkg.price}
                <span className="text-xs font-normal text-gray-500">
                  /Per Person
                </span>
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? "border-[#f8ac0d] text-[#f8ac0d]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {activeTab === "Overview" && (
              <div>
                <h3 className="text-2xl font-bold text-[#092638] mb-4">
                  Package Overview
                </h3>
                <div className="prose max-w-none text-gray-600">
                  <p>
                    Explore the rich history and stunning architecture of
                    Istanbul, to stunning landscapes and ancient rock-cut
                    churches of Cappadocia. Experience the mesmerizing Bosphorus
                    cruise, where ancient minarets and modern skyscrapers blend
                    seamlessly along the waterfront, offering a breathtaking
                    journey.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 mt-4">
                    {pkg.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-[#092638] mb-2 flex items-center gap-2">
                      <FaPlane /> Flight & Transport
                    </h4>
                    <p className="text-sm text-gray-600">Coming soon.</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-[#092638] mb-2 flex items-center gap-2">
                      <FaUtensils /> Meals
                    </h4>
                    <p className="text-sm text-gray-600">
                      Regular Packages will have Meals in Buffet Style. Premium
                      and Prestige Packages will have meals in Parcel Service.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-[#092638] mb-2 flex items-center gap-2">
                      <FaPassport /> Visa & Taxes
                    </h4>
                    <p className="text-sm text-gray-600">
                      Turkey visa included.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* You can add content for other tabs here */}
            {activeTab !== "Overview" && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-[#092638]">
                  {activeTab} Information
                </h3>
                <p className="text-gray-500 mt-2">
                  Details for this section are coming soon.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
