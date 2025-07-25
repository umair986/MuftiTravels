"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FaStar, FaArrowRight } from "react-icons/fa";

export default function PackageCardMumbai({
  handleBookNow,
}: {
  handleBookNow: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
    >
      <div className="relative">
        <Image
          src="/packages/umrah/umrah1.jpeg"
          alt="15 Days Regular Umrah from Mumbai"
          width={400}
          height={250}
          className="w-full h-56 object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            -5% Off
          </span>
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
            Popular
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {Array(5)
              .fill(0)
              .map((_, i: number) => (
                <FaStar key={i} className="text-yellow-400" />
              ))}
          </div>
          <span className="text-gray-500 text-sm">(33 Reviews)</span>
        </div>

        <h3 className="text-lg font-bold text-[#092638] mb-4 flex-grow">
          15 Days Regular Umrah from Mumbai
        </h3>

        <div className="flex justify-between items-center mt-auto">
          <div>
            <p className="text-sm text-gray-500">Starting From</p>
            {/* UPDATED: Price changed to Bronze + Quad */}
            <p className="text-xl font-bold text-[#092638]">₹78,786</p>
          </div>
          <button
            onClick={handleBookNow}
            className="bg-[#f8ac0d] hover:bg-[#e59a00] text-white font-bold py-3 px-5 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
          >
            Book Now
            <FaArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
