export interface Badge {
  text: string;
  color: string;
}

export type CategoryType = "Umrah Fixed Group" | "Umrah Land Package" | "Ziyarat";

export interface PackageData {
  name: string;
  image: string;
  price: string;
  originalPrice: string;
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

export const packageData: PackageDataType  = addSlugsToPackages({
  "Umrah Fixed Group": [
    {
      name: "Umrah Plus Turkey",
      image: "/package1.webp",
      price: "₹230,786",
      originalPrice: "₹243,000",
      reviews: 23,
      rating: 5,
      badges: [
        { text: "-5% Off", color: "bg-red-500" },
        { text: "Popular", color: "bg-green-500" },
      ],
      features: [
        "Group Travel",
        "Standard Hotels",
        "Economy Flights",
        "Turkey Extension",
      ],
    },
    {
      name: "Umrah Plus Dubai",
      image: "/package2.webp",
      price: "₹149,786",
      originalPrice: "₹160,000",
      reviews: 30,
      rating: 5,
      badges: [{ text: "Featured", color: "bg-blue-500" }],
      features: [
        "Private Rooms",
        "3-star Hotels",
        "Guided Ziyarat",
        "Dubai Stopover",
      ],
    },
    {
      name: "Umrah Plus Baitul Muqaddas",
      image: "/package3.webp",
      price: "₹175,786",
      originalPrice: "₹185,000",
      reviews: 21,
      rating: 5,
      badges: [{ text: "New", color: "bg-yellow-500" }],
      features: [
        "5-star Hotels",
        "VIP Lounge Access",
        "Dedicated Guide",
        "Jerusalem Visit",
      ],
    },
  ],
  "Umrah Land Package": [
    {
      name: "Basic Land Package",
      image: "/package1.webp",
      price: "₹95,000",
      originalPrice: "₹105,000",
      reviews: 18,
      rating: 4,
      badges: [{ text: "Popular", color: "bg-green-500" }],
      features: [
        "Land Transport",
        "3-star Hotels",
        "Group Ziyarat",
        "Meals Included",
      ],
    },
    {
      name: "Deluxe Land Package",
      image: "/package2.webp",
      price: "₹125,000",
      originalPrice: "₹135,000",
      reviews: 25,
      rating: 5,
      badges: [{ text: "Best Value", color: "bg-purple-500" }],
      features: ["Luxury Bus", "4-star Hotels", "Private Ziyarat", "All Meals"],
    },
    {
      name: "Premium Land Package",
      image: "/package3.webp",
      price: "₹155,000",
      originalPrice: "₹170,000",
      reviews: 15,
      rating: 5,
      badges: [{ text: "Luxury", color: "bg-indigo-500" }],
      features: [
        "Private Transport",
        "5-star Hotels",
        "Personal Guide",
        "Premium Meals",
      ],
    },
  ],
  Ziyarat: [
    {
      name: "Makkah Ziyarat Special",
      image: "/package1.webp",
      price: "₹45,000",
      originalPrice: "₹50,000",
      reviews: 32,
      rating: 5,
      badges: [{ text: "Most Popular", color: "bg-green-500" }],
      features: [
        "All Makkah Sites",
        "Expert Guide",
        "Transportation",
        "Group Tour",
      ],
    },
    {
      name: "Madinah Ziyarat Complete",
      image: "/package2.webp",
      price: "₹38,000",
      originalPrice: "₹42,000",
      reviews: 28,
      rating: 4,
      badges: [{ text: "Recommended", color: "bg-blue-500" }],
      features: [
        "All Madinah Sites",
        "Historical Tours",
        "Transportation",
        "Lunch Included",
      ],
    },
    {
      name: "Combined Ziyarat Package",
      image: "/package3.webp",
      price: "₹75,000",
      originalPrice: "₹85,000",
      reviews: 19,
      rating: 5,
      badges: [{ text: "Complete", color: "bg-orange-500" }],
      features: [
        "Makkah & Madinah",
        "Extended Tours",
        "Private Guide",
        "All Meals",
      ],
    },
  ],
});