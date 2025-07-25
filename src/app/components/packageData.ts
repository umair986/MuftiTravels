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
  // The 'price' field is replaced with a 'prices' object
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

// Base prices for Quad sharing as per your request
const basePrices: Record<PackageTier, number> = {
  'Super Saver': 72000,
  'Bronze': 83000,
  'Silver': 88000,
  'Gold': 99000,
  'Platinum': 123000,
};

// Function to generate prices for other sharing types based on the Quad price
const generatePriceTiers = (baseQuadPrice: number): PriceMap => ({
    'Quint': baseQuadPrice - 4000,
    'Quad': baseQuadPrice,
    'Triple': baseQuadPrice + 5000,
    'Double': baseQuadPrice + 10000,
    'Child(6-11)': baseQuadPrice - 10000, // Example: Child with bed price
    'Child(2-5)': baseQuadPrice - 25000, // Example: Child without bed price
    'Infant(0-2)': 20000, // Example: Fixed infant price
});

export const packageData: PackageDataType  = addSlugsToPackages({
  "Umrah Fixed Group": [
    {
      name: "15 Days Regular Umrah from Mumbai",
      image: "/packages/umrah/umrah1.jpeg",
      reviews: 33,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Group Travel", "Standard Hotels", "Economy Flights" ],
      prices: {
        'Super Saver': generatePriceTiers(basePrices["Super Saver"]),
        'Bronze': generatePriceTiers(basePrices.Bronze),
        'Silver': generatePriceTiers(basePrices.Silver),
        'Gold': generatePriceTiers(basePrices.Gold),
        'Platinum': generatePriceTiers(basePrices.Platinum),
      }
    },
    {
      name: "17 Days Regular Umrah from Lucknow",
      image: "/packages/umrah/umrah2.jpeg",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: [ "Private Rooms", "3-star Hotels", "Guided Ziyarat" ],
      prices: {
        'Super Saver': generatePriceTiers(basePrices["Super Saver"]),
        'Bronze': generatePriceTiers(basePrices.Bronze),
        'Silver': generatePriceTiers(basePrices.Silver),
        'Gold': generatePriceTiers(basePrices.Gold),
        'Platinum': generatePriceTiers(basePrices.Platinum),
      }
    },
    {
      name: "15 Days Regular Umrah from Delhi",
      image: "/packages/umrah/umrah4.jpg",
      reviews: 33,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: [ "5-star Hotels", "VIP Lounge Access", "Dedicated Guide" ],
       prices: {
        'Super Saver': generatePriceTiers(basePrices["Super Saver"]),
        'Bronze': generatePriceTiers(basePrices.Bronze),
        'Silver': generatePriceTiers(basePrices.Silver),
        'Gold': generatePriceTiers(basePrices.Gold),
        'Platinum': generatePriceTiers(basePrices.Platinum),
      }
    },
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
