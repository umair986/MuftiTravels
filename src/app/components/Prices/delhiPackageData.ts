import { PackageData, TierPriceMap } from "@/app/components/packageData";

// ==================================================================
// == DELHI PACKAGE PRICES ==
// Prices are based on Mumbai, with an increase of:
// - 5k for Gold and Silver
// - 4k for Bronze
// - 3k for Super Saver
// ==================================================================

const delhiPrices: TierPriceMap = {
  'Super Saver': {
    'Quint': 69786 + 3000,
    'Quad': 70786 + 3000,
    'Triple': 72786 + 3000,
    'Double': 76786 + 3000,
    'Child(6-11)': 65786 + 3000,
    'Child(2-5)': 59786 + 3000,
    'Infant(0-2)': 25786 + 3000,
  },
  'Bronze': {
    'Quint': 76786 + 4000,
    'Quad': 78786 + 4000,
    'Triple': 82786 + 4000,
    'Double': 90786 + 4000,
    'Child(6-11)': 65786 + 4000,
    'Child(2-5)': 59786 + 4000,
    'Infant(0-2)': 25786 + 4000,
  },
  'Silver': {
    'Quint': 82786 + 5000,
    'Quad': 86786 + 5000,
    'Triple': 92786 + 5000,
    'Double': 104786 + 5000,
    'Child(6-11)': 65786 + 5000,
    'Child(2-5)': 59786 + 5000,
    'Infant(0-2)': 25786 + 5000,
  },
  'Gold': {
    'Quint': 99786 + 5000,
    'Quad': 101786 + 5000,
    'Triple': 106786 + 5000,
    'Double': 119786 + 5000,
    'Child(6-11)': 65786 + 5000,
    'Child(2-5)': 59786 + 5000,
    'Infant(0-2)': 25786 + 5000,
  },
};

// This is the complete data object for the dedicated Delhi page.
export const delhiPackageData: PackageData = {
  name: "15 Days Regular Umrah from Delhi",
  image: "/packages/umrah/umrah4.jpg",
  reviews: 33,
  rating: 5,
  badges: [{ text: "New", color: "bg-yellow-500" }],
  features: [ "Direct Flight from Delhi", "Deluxe Hotels near Haram", "Special Guided Ziyarat" ],
  slug: "15-days-regular-umrah-from-delhi",
  prices: delhiPrices
};
