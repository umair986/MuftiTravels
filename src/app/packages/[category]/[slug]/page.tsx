"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, FormEvent, FC } from "react";
import {
  FaStar,
  FaPlane,
  FaUtensils,
  FaPassport,
  FaPlus,
  FaMinus,
  FaRegCalendarAlt,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaBan,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageData,
  packageData,
  CategoryType,
} from "../../../components/packageData";
import {
  policies,
  notes,
  inclusions,
  exclusions,
} from "../../../components/policyData"; // Import the new data

// --- Reusable List Component ---
const InfoList: FC<{
  title: string;
  items: string[];
  icon: React.ReactNode;
  iconColor: string;
}> = ({ title, items, icon, iconColor }) => (
  <div>
    <h3
      className={`text-xl font-bold text-[#092638] mb-4 flex items-center gap-3`}
    >
      <span className={iconColor}>{icon}</span> {title}
    </h3>
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="text-gray-400 mt-1">✓</span>
          <span className="text-gray-700">{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

// --- Policies Content Component ---
const PoliciesContent = () => (
  <div className="space-y-8">
    <InfoList
      title="Payment Policy"
      items={policies.payment}
      icon={<FaMoneyBillWave />}
      iconColor="text-green-500"
    />
    <InfoList
      title="Cancellation Policy"
      items={policies.cancellation}
      icon={<FaBan />}
      iconColor="text-red-500"
    />
  </div>
);

// --- Inclusions/Exclusions Content Component ---
const InclusionsExclusionsContent = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <InfoList
      title="Inclusions"
      items={inclusions}
      icon={<FaCheckCircle />}
      iconColor="text-green-500"
    />
    <InfoList
      title="Exclusions"
      items={exclusions}
      icon={<FaTimesCircle />}
      iconColor="text-red-500"
    />
  </div>
);

// --- Important Notes Content Component ---
const ImportantNotesContent = () => (
  <div>
    <h3 className="text-xl font-bold text-[#092638] mb-4 flex items-center gap-3">
      <FaExclamationTriangle className="text-yellow-500" /> Important Notes
    </h3>
    <ul className="space-y-3 mb-6">
      {notes.main.map((note, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="text-gray-400 mt-1">▸</span>
          <span className="text-gray-700">{note}</span>
        </li>
      ))}
    </ul>
    <h4 className="font-semibold text-gray-800 mb-2">Required Documents:</h4>
    <ul className="space-y-2 list-disc list-inside text-gray-700">
      {notes.documents.map((doc, index) => (
        <li key={index}>{doc}</li>
      ))}
    </ul>
  </div>
);

// --- Enquiry Form Component (No changes needed) ---
const EnquiryForm = ({
  pkgName,
  onClose,
}: {
  pkgName: string;
  onClose: () => void;
}) => {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleAdultsChange = (amount: number) => {
    setAdults((prev) => Math.max(1, prev + amount));
  };

  const handleChildrenChange = (amount: number) => {
    setChildren((prev) => Math.max(0, prev + amount));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitMessage(
      "Thank you for your enquiry! Our team will get in touch with you shortly."
    );
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <FaTimes size={20} />
        </button>
        <div className="p-6 sm:p-8">
          <div className="text-left mb-6">
            <p className="text-sm font-medium text-[#f8ac0d]">
              Fill in your details,
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092638]">
              Our team will get in touch!
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enquiring for: <span className="font-semibold">{pkgName}</span>
            </p>
          </div>
          {submitMessage ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-green-600">
                {submitMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <input
                type="tel"
                placeholder="Phone-no"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <div>
                <p className="font-semibold text-gray-700 mb-2">
                  Number of Passengers:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Adults</label>
                    <div className="flex items-center border border-gray-300 rounded-lg p-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(-1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaMinus />
                      </button>
                      <span className="flex-grow text-center font-semibold text-lg">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Children (below 12 years)
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg p-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(-1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaMinus />
                      </button>
                      <span className="flex-grow text-center font-semibold text-lg">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => (e.target.type = "text")}
                  placeholder="dd-mm-yyyy"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
                />
                <FaRegCalendarAlt className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-gray-400"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Page Component ---
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
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (params.category && params.slug) {
      try {
        const categorySlug = Array.isArray(params.category)
          ? params.category[0]
          : params.category;
        const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
        const categoryKey = categorySlugMap[categorySlug];
        if (!categoryKey || !packageData[categoryKey]) {
          router.push("/404");
          return;
        }
        const foundPackage = packageData[categoryKey].find(
          (p) => p.slug === slug
        );
        if (!foundPackage) {
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

  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFormOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#f8ac0d]"></div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center text-center p-4">
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

  const tabs = ["Overview", "Includes/Excludes", "Policies", "Important Notes"];

  return (
    <>
      <AnimatePresence>
        {isFormOpen && (
          <EnquiryForm
            pkgName={pkg.name}
            onClose={() => setIsFormOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="bg-[#f7f9fc] min-h-screen font-sans">
        <div className="relative h-64 md:h-80">
          <Image
            src={pkg.image}
            alt={pkg.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
          <div className="absolute inset-0 flex items-end justify-center p-4 sm:p-8">
            <div className="text-center text-white w-full max-w-7xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                {pkg.name}
              </h1>
              <p className="text-gray-300 mt-2 text-sm">
                Home » {categoryName} »{" "}
                <span className="text-white font-semibold">
                  Package Details
                </span>
              </p>
            </div>
          </div>
        </div>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-10 sm:-mt-16">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#092638]">
                  {pkg.name}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-gray-600">
                  <div className="flex items-center gap-1">
                    {Array(pkg.rating)
                      .fill(0)
                      .map((_, i) => (
                        <FaStar key={i} className="text-yellow-400" />
                      ))}
                    <span className="ml-1 text-sm sm:text-base">
                      ({pkg.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-4 md:mt-0 w-full md:w-auto flex items-center justify-center gap-2 bg-[#f8ac0d] text-white px-5 py-3 rounded-lg shadow-md hover:bg-[#e59a00] transition-all font-semibold"
              >
                <span>Enquire Now</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-b border-gray-200 py-4 sm:py-6 mb-6 md:mb-8 text-center">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Service</p>
                <p className="font-semibold text-[#092638] text-sm sm:text-base">
                  {categoryName.split(" ")[0]}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Package Type</p>
                <p className="font-semibold text-[#092638] text-sm sm:text-base">
                  Silver
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Sharing Type</p>
                <p className="font-semibold text-[#092638] text-sm sm:text-base">
                  Double
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Current Price
                </p>
                <p className="font-bold text-base sm:text-lg text-[#f8ac0d]">
                  {pkg.price}
                  <span className="text-xs font-normal text-gray-500">/PP</span>
                </p>
              </div>
            </div>

            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap pb-3 pt-1 px-1 border-b-2 font-medium text-sm transition-colors ${
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

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === "Overview" && (
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#092638] mb-4">
                      Package Overview
                    </h3>
                    <div className="prose prose-sm sm:prose-base max-w-none text-gray-600">
                      <p>
                        Explore the rich history and stunning architecture of
                        Istanbul, to stunning landscapes and ancient rock-cut
                        churches of Cappadocia. Experience the mesmerizing
                        Bosphorus cruise, where ancient minarets and modern
                        skyscrapers blend seamlessly along the waterfront,
                        offering a breathtaking journey.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 mt-4">
                        {pkg.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
                          Regular Packages will have Meals in Buffet Style.
                          Premium and Prestige Packages will have meals in
                          Parcel Service.
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
                {activeTab === "Includes/Excludes" && (
                  <InclusionsExclusionsContent />
                )}
                {activeTab === "Policies" && <PoliciesContent />}
                {activeTab === "Important Notes" && <ImportantNotesContent />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
