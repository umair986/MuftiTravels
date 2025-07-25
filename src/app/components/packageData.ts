// export interface Badge {
//   text: string;
//   color: string;
// }

// export type CategoryType = "Umrah Fixed Group" | "Umrah Land Package" | "Ziyarat";

// // Define the types for our new dynamic pricing structure
// export type PackageTier = 'Super Saver' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
// export type SharingType = 'Quint' | 'Quad' | 'Triple' | 'Double' | 'Child(6-11)' | 'Child(2-5)' | 'Infant(0-2)';
// export type PriceMap = {
//   [key in SharingType]?: number;
// };

// export type TierPriceMap = {
//   [key in PackageTier]?: PriceMap;
// };

// export interface PackageData {
//   name: string;
//   image: string;
//   reviews: number;
//   rating: 1 | 2 | 3 | 4 | 5;
//   features: string[];
//   badges: Badge[];
//   slug: string;
//   prices: TierPriceMap;
// }

// export type PackageDataType = Record<CategoryType, PackageData[]>;

// const generateSlug = (name: string): string => {
//   return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
// };

// const addSlugsToPackages = (data: Record<CategoryType, Omit<PackageData, 'slug'>[]>): PackageDataType => {
//   return Object.fromEntries(
//     Object.entries(data).map(([category, packages]) => [
//       category,
//       packages.map((pkg) => ({
//         ...pkg,
//         slug: generateSlug(pkg.name)
//       }))
//     ])
//   ) as PackageDataType;
// };

// // This function is now only used for packages that don't have detailed pricing yet.
// const generatePriceTiers = (baseQuadPrice: number): PriceMap => ({
//     'Quint': baseQuadPrice - 4000,
//     'Quad': baseQuadPrice,
//     'Triple': baseQuadPrice + 5000,
//     'Double': baseQuadPrice + 10000,
//     'Child(6-11)': baseQuadPrice - 10000,
//     'Child(2-5)': baseQuadPrice - 25000,
//     'Infant(0-2)': 20000,
// });

// export const packageData: PackageDataType  = addSlugsToPackages({
//   "Umrah Fixed Group": [
//     {
//       name: "15 Days Regular Umrah from Mumbai",
//       image: "/packages/umrah/umrah1.jpeg",
//       reviews: 33,
//       rating: 5,
//       badges: [
//         { text: "-5% Off", color: "bg-red-500" },
//         { text: "Popular", color: "bg-green-500" },
//       ],
//       features: [ "Group Travel", "Standard Hotels", "Economy Flights" ],
//       prices: {
//         'Super Saver': { 'Quint': 69786, 'Quad': 70786, 'Triple': 72786, 'Double': 76786, 'Child(6-11)': 65786, 'Child(2-5)': 59786, 'Infant(0-2)': 25786 },
//         'Bronze': { 'Quint': 76786, 'Quad': 78786, 'Triple': 82786, 'Double': 90786, 'Child(6-11)': 65786, 'Child(2-5)': 59786, 'Infant(0-2)': 25786 },
//         'Silver': { 'Quint': 82786, 'Quad': 86786, 'Triple': 92786, 'Double': 104786, 'Child(6-11)': 65786, 'Child(2-5)': 59786, 'Infant(0-2)': 25786 },
//         'Gold': { 'Quint': 99786, 'Quad': 101786, 'Triple': 106786, 'Double': 119786, 'Child(6-11)': 65786, 'Child(2-5)': 59786, 'Infant(0-2)': 25786 },
//       }
//     },
//     {
//       name: "15 Days Regular Umrah from Lucknow",
//       image: "/packages/umrah/umrah2.jpeg",
//       reviews: 28,
//       rating: 5,
//       badges: [{ text: "Featured", color: "bg-blue-500" }],
//       features: [ "Private Rooms", "3-star Hotels", "Guided Ziyarat" ],
//       prices: {
//         'Super Saver': { 'Quint': 72786, 'Quad': 73786, 'Triple': 75786, 'Double': 79786, 'Child(6-11)': 68786, 'Child(2-5)': 62786, 'Infant(0-2)': 28786 },
//         'Bronze': { 'Quint': 80786, 'Quad': 82786, 'Triple': 86786, 'Double': 94786, 'Child(6-11)': 69786, 'Child(2-5)': 63786, 'Infant(0-2)': 29786 },
//         'Silver': { 'Quint': 87786, 'Quad': 91786, 'Triple': 97786, 'Double': 109786, 'Child(6-11)': 70786, 'Child(2-5)': 64786, 'Infant(0-2)': 30786 },
//         'Gold': { 'Quint': 104786, 'Quad': 106786, 'Triple': 111786, 'Double': 124786, 'Child(6-11)': 70786, 'Child(2-5)': 64786, 'Infant(0-2)': 30786 },
//       }
//     },
//     {
//       name: "15 Days Regular Umrah from Delhi",
//       image: "/packages/umrah/umrah4.jpg",
//       reviews: 33,
//       rating: 5,
//       badges: [{ text: "New", color: "bg-yellow-500" }],
//       features: [ "5-star Hotels", "VIP Lounge Access", "Dedicated Guide" ],
//        prices: {
//         'Super Saver': { 'Quint': 72786, 'Quad': 73786, 'Triple': 75786, 'Double': 79786, 'Child(6-11)': 68786, 'Child(2-5)': 62786, 'Infant(0-2)': 28786 },
//         'Bronze': { 'Quint': 80786, 'Quad': 82786, 'Triple': 86786, 'Double': 94786, 'Child(6-11)': 69786, 'Child(2-5)': 63786, 'Infant(0-2)': 29786 },
//         'Silver': { 'Quint': 87786, 'Quad': 91786, 'Triple': 97786, 'Double': 109786, 'Child(6-11)': 70786, 'Child(2-5)': 64786, 'Infant(0-2)': 30786 },
//         'Gold': { 'Quint': 104786, 'Quad': 106786, 'Triple': 111786, 'Double': 124786, 'Child(6-11)': 70786, 'Child(2-5)': 64786, 'Infant(0-2)': 30786 },
//       }
//     },
//   ],
//   "Umrah Land Package": [
//     {
//       name: "14 Days Umrah Land Package",
//       image: "/packages/package1.webp",
//       reviews: 35,
//       rating: 5,
//       badges: [
//         { text: "-5% Off", color: "bg-red-500" },
//         { text: "Popular", color: "bg-green-500" },
//       ],
//       features: [ "Makkah & Madinah Stay", "Ground Transport", "Visa Assistance" ],
//       prices: {
//         'Silver': generatePriceTiers(64786),
//         'Gold': generatePriceTiers(74786)
//       }
//     },
//     {
//       name: "30 Days Super saver Land Package",
//       image: "/packages/package2.webp",
//       reviews: 28,
//       rating: 5,
//       badges: [{ text: "Featured", color: "bg-blue-500" }],
//       features: ["Extended Stay", "Economy Hotels", "Group Ziyarat"],
//       prices: {
//         'Super Saver': generatePriceTiers(62786),
//       }
//     },
//     {
//       name: "25 Days Super saver Land Package",
//       image: "/packages/package3.webp",
//       reviews: 25,
//       rating: 5,
//       badges: [{ text: "New", color: "bg-yellow-500" }],
//       features: ["Budget Accommodation", "Self-guided Ziyarat", "Visa Included"],
//       prices: {
//         'Super Saver': generatePriceTiers(55786),
//       }
//     },
//   ],
//   Ziyarat: [
//      {
//       name: "Umrah Plus Turkey",
//       image: "/packages/package1.webp",
//       reviews: 26,
//       rating: 5,
//       badges: [
//         { text: "-5% Off", color: "bg-red-500" },
//         { text: "Popular", color: "bg-green-500" },
//       ],
//       features: [ "Umrah Visa", "Turkey Tourist Visa", "Guided Tours" ],
//       prices: {
//         'Platinum': generatePriceTiers(230786)
//       }
//     },
//     {
//       name: "Umrah Plus Dubai",
//       image: "/packages/package2.webp",
//       reviews: 28,
//       rating: 5,
//       badges: [{ text: "Featured", color: "bg-blue-500" }],
//       features: [ "Umrah Visa", "Dubai Excursions", "4-star Hotels" ],
//       prices: {
//         'Gold': generatePriceTiers(149786),
//         'Platinum': generatePriceTiers(179786),
//       }
//     },
//     {
//       name: "Umrah Plus Baitul Muqaddas",
//       image: "/packages/package3.webp",
//       reviews: 33,
//       rating: 5,
//       badges: [{ text: "New", color: "bg-yellow-500" }],
//       features: ["Historical Ziyarat", "All Visas Included", "Premium Hotels"],
//       prices: {
//         'Platinum': generatePriceTiers(175786)
//       }
//     },
//   ],
// });

export interface Badge {
  text: string;
  color: string;
}

export type CategoryType = "Umrah Fixed Group" | "Umrah Land Package" | "Ziyarat";

// Define the types for our new dynamic pricing structure
export type PackageTier = 'Super Saver' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type SharingType = 'Quint' | 'Quad' | 'Triple' | 'Double' | 'Child(6-11)' | 'Child(2-5)' | 'Infant(0-2)';
export type PriceMap = {
  [key in SharingType]?: number;
};

export type TierPriceMap = {
  [key in PackageTier]?: PriceMap;
};

export interface PackageData {
  name: string;
  image: string;
  reviews: number;
  rating: 1 | 2 | 3 | 4 | 5;
  features: string[];
  badges: Badge[];
  slug: string;
  prices: TierPriceMap;
}

export type PackageDataType = Record<CategoryType, PackageData[]>;

const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

const addSlugsToPackages = (data: Record<CategoryType, Omit<PackageData, 'slug'>[]>): PackageDataType => {
  return Object.fromEntries(
    Object.entries(data).map(([category, packages]) => [
      category,
      packages.map((pkg) => ({
        ...pkg,
        slug: generateSlug(pkg.name)
      }))
    ])
  ) as PackageDataType;
};

// This function is now only used for packages that don't have detailed pricing yet.
const generatePriceTiers = (baseQuadPrice: number): PriceMap => ({
    'Quint': baseQuadPrice - 4000,
    'Quad': baseQuadPrice,
    'Triple': baseQuadPrice + 5000,
    'Double': baseQuadPrice + 10000,
    'Child(6-11)': baseQuadPrice - 10000,
    'Child(2-5)': baseQuadPrice - 25000,
    'Infant(0-2)': 20000,
});

export const packageData: PackageDataType  = addSlugsToPackages({
  "Umrah Fixed Group": [
    // REMOVED: Mumbai, Lucknow, and Delhi packages are now managed in their own dedicated files.
    // This array is now empty, but you can add other "Fixed Group" packages here in the future.
  ],
  "Umrah Land Package": [
    {
      name: "14 Days Umrah Land Package",
      image: "/packages/package1.webp",
      reviews: 35,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Makkah & Madinah Stay", "Ground Transport", "Visa Assistance" ],
      prices: {
        'Silver': generatePriceTiers(64786),
        'Gold': generatePriceTiers(74786)
      }
    },
    {
      name: "30 Days Super saver Land Package",
      image: "/packages/package2.webp",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: ["Extended Stay", "Economy Hotels", "Group Ziyarat"],
      prices: {
        'Super Saver': generatePriceTiers(62786),
      }
    },
    {
      name: "25 Days Super saver Land Package",
      image: "/packages/package3.webp",
      reviews: 25,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: ["Budget Accommodation", "Self-guided Ziyarat", "Visa Included"],
      prices: {
        'Super Saver': generatePriceTiers(55786),
      }
    },
  ],
  Ziyarat: [
     {
      name: "Umrah Plus Turkey",
      image: "/packages/package1.webp",
      reviews: 26,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Umrah Visa", "Turkey Tourist Visa", "Guided Tours" ],
      prices: {
        'Platinum': generatePriceTiers(230786)
      }
    },
    {
      name: "Umrah Plus Dubai",
      image: "/packages/package2.webp",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: [ "Umrah Visa", "Dubai Excursions", "4-star Hotels" ],
      prices: {
        'Gold': generatePriceTiers(149786),
        'Platinum': generatePriceTiers(179786),
      }
    },
    {
      name: "Umrah Plus Baitul Muqaddas",
      image: "/packages/package3.webp",
      reviews: 33,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: ["Historical Ziyarat", "All Visas Included", "Premium Hotels"],
      prices: {
        'Platinum': generatePriceTiers(175786)
      }
    },
  ],
});
