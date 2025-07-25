"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const cities = {
  Mumbai: {
    "Single Bed": "₹1,00,000",
    "Double Bed": "₹1,80,000",
    "Triple Bed": "₹2,40,000",
    "Four Bed": "₹2,90,000",
    "Five Bed": "₹3,25,000",
  },
  Delhi: {
    "Single Bed": "₹1,05,000",
    "Double Bed": "₹1,85,000",
    "Triple Bed": "₹2,45,000",
    "Four Bed": "₹2,95,000",
    "Five Bed": "₹3,30,000",
  },
  Bengaluru: {
    "Single Bed": "₹1,08,000",
    "Double Bed": "₹1,88,000",
    "Triple Bed": "₹2,48,000",
    "Four Bed": "₹2,98,000",
    "Five Bed": "₹3,33,000",
  },
  Hyderabad: {
    "Single Bed": "₹1,02,000",
    "Double Bed": "₹1,82,000",
    "Triple Bed": "₹2,42,000",
    "Four Bed": "₹2,92,000",
    "Five Bed": "₹3,27,000",
  },
  Chennai: {
    "Single Bed": "₹1,07,000",
    "Double Bed": "₹1,87,000",
    "Triple Bed": "₹2,47,000",
    "Four Bed": "₹2,97,000",
    "Five Bed": "₹3,32,000",
  },
};

export default function PackagePopup({
  onClose,
  packageData,
}: {
  onClose: () => void;
  packageData: any;
}) {
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [roomPrices, setRoomPrices] = useState(cities[selectedCity]);

  useEffect(() => {
    setRoomPrices(cities[selectedCity]);
  }, [selectedCity]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-xl max-w-lg w-full shadow-xl p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-4 text-2xl text-gray-600 hover:text-red-500"
          >
            &times;
          </button>

          {packageData ? (
            <h2 className="text-xl font-semibold text-[#092638] mb-4">
              {packageData.name} Details
            </h2>
          ) : (
            <h2 className="text-xl font-semibold text-[#092638] mb-4">
              Package Details
            </h2>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select City
            </label>
            <select
              className="w-full border rounded p-2 text-gray-800"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              {Object.keys(cities).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {Object.entries(roomPrices).map(([roomType, price]) => (
              <div
                key={roomType}
                className="flex justify-between border-b pb-1 text-gray-700"
              >
                <span>{roomType}</span>
                <span>{price}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
