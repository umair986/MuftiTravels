import { PackageData, TierPriceMap } from "@/app/components/packageData";

// ==================================================================
// == MUMBAI PACKAGE PRICES ==
// Final, calculated prices. Edit these values directly.
// ==================================================================

const mumbaiPrices: TierPriceMap = {
  'Super Saver': {
    'Quint': 69786,
    'Quad': 70786,
    'Triple': 72786,
    'Double': 76786,
    'Child(6-11)': 65786,
    'Child(2-5)': 59786,
    'Infant(0-2)': 25786,
  },
  'Bronze': {
    'Quint': 76786,
    'Quad': 78786,
    'Triple': 82786,
    'Double': 90786,
    'Child(6-11)': 65786,
    'Child(2-5)': 59786,
    'Infant(0-2)': 25786,
  },
  'Silver': {
    'Quint': 82786,
    'Quad': 86786,
    'Triple': 92786,
    'Double': 104786,
    'Child(6-11)': 65786,
    'Child(2-5)': 59786,
    'Infant(0-2)': 25786,
  },
  'Gold': {
    'Quint': 99786,
    'Quad': 101786,
    'Triple': 106786,
    'Double': 119786,
    'Child(6-11)': 65786,
    'Child(2-5)': 59786,
    'Infant(0-2)': 25786,
  },
  // REMOVED: Platinum tier is no longer available for this package.
};


// This is the complete data object for the dedicated Mumbai page.
export const mumbaiPackageData: PackageData = {
  name: "15 Days Regular Umrah from Mumbai",
  image: "/packages/umrah/umrah1.jpeg",
  reviews: 45,
  rating: 5,
  badges: [
    { text: "Best Seller", color: "bg-red-500" },
    { text: "Mumbai Special", color: "bg-blue-500" },
  ],
  features: [ "Direct Flight from Mumbai", "Deluxe Hotels near Haram", "Special Guided Ziyarat" ],
  slug: "15-days-regular-umrah-from-mumbai",
  prices: mumbaiPrices
};
