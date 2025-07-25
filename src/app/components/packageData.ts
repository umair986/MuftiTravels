export interface Badge {
  text: string;
  color: string;
}

export type CategoryType = "Umrah Fixed Group" | "Umrah Land Package" | "Ziyarat";

export interface PackageData {
  name: string;
  image: string; // This will now be a local path, e.g., "/package1.webp"
  price: string;
  originalPrice?: string;
  reviews: number;
  rating: 1 | 2 | 3 | 4 | 5;
  features: string[];
  badges: Badge[];
  slug: string;
}

export type PackageDataType = Record<CategoryType, PackageData[]>;

// Helper function to generate slug
const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

// Add slugs to package data
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

// --- IMPORTANT ---
// Make sure you have images in your `public` folder named:
// - package1.webp
// - package2.webp
// - package3.webp

export const packageData: PackageDataType  = addSlugsToPackages({
  "Umrah Fixed Group": [
    {
      name: "15 Days Regular Umrah from Mumbai",
      image: "/packages/umrah/umrah1.jpeg",
      price: "₹89,786",
      reviews: 33,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Group Travel", "Standard Hotels", "Economy Flights" ],
    },
    {
      name: "17 Days Regular Umrah from Lucknow",
      image: "/packages/umrah/umrah2.jpeg",
      price: "₹100,786",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: [ "Private Rooms", "3-star Hotels", "Guided Ziyarat" ],
    },
    {
      name: "15 Days Regular Umrah from Delhi",
      image: "/packages/umrah/umrah4.jpg",
      price: "₹86,786",
      reviews: 33,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: [ "5-star Hotels", "VIP Lounge Access", "Dedicated Guide" ],
    },
  ],
  "Umrah Land Package": [
    {
      name: "14 Days Umrah Land Package",
      image: "/package1.webp",
      price: "₹64,786",
      reviews: 35,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Makkah & Madinah Stay", "Ground Transport", "Visa Assistance" ],
    },
    {
      name: "30 Days Super saver Land Package",
      image: "/package2.webp",
      price: "₹62,786",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: ["Extended Stay", "Economy Hotels", "Group Ziyarat"],
    },
    {
      name: "25 Days Super saver Land Package",
      image: "/package3.webp",
      price: "₹55,786",
      reviews: 25,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: ["Budget Accommodation", "Self-guided Ziyarat", "Visa Included"],
    },
  ],
  Ziyarat: [
    {
      name: "Umrah Plus Turkey",
      image: "/package1.webp",
      price: "₹230,786",
      reviews: 26,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [ "Umrah Visa", "Turkey Tourist Visa", "Guided Tours" ],
    },
    {
      name: "Umrah Plus Dubai",
      image: "/package2.webp",
      price: "₹149,786",
      reviews: 28,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: [ "Umrah Visa", "Dubai Excursions", "4-star Hotels" ],
    },
    {
      name: "Umrah Plus Baitul Muqaddas",
      image: "/package3.webp",
      price: "₹175,786",
      reviews: 33,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: ["Historical Ziyarat", "All Visas Included", "Premium Hotels"],
    },
  ],
});
