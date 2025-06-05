"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const packages = [
  {
    name: "Economy Package",
    image: "/package1.webp",
    price: "Starting from ₹85,000",
    features: ["Group Travel", "Standard Hotels", "Economy Flights"],
  },
  {
    name: "Standard Package",
    image: "/package2.webp",
    price: "Starting from ₹1,20,000",
    features: ["Private Rooms", "3-star Hotels", "Guided Ziyarat"],
  },
  {
    name: "Premium Package",
    image: "/package3.webp",
    price: "Starting from ₹1,75,000",
    features: ["5-star Hotels", "VIP Lounge Access", "Dedicated Guide"],
  },
];

export default function Packages() {
  return (
    <section className="py-16 px-4 bg-white" id="packages">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#092638] mb-8">
          Our Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <Image
                src={pkg.image}
                alt={pkg.name}
                width={400}
                height={250}
                className="w-full h-48 object-cover"
              />
              <div className="p-6 text-left">
                <h3 className="text-xl font-semibold text-[#092638] mb-2">
                  {pkg.name}
                </h3>
                <p className="text-gray-700 mb-4">{pkg.price}</p>
                <ul className="text-sm text-gray-600 mb-4 list-disc pl-5">
                  {pkg.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
                <button className="bg-[#f8ac0d] hover:bg-[#e59a00] text-black font-medium py-2 px-4 rounded">
                  Enquire Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
