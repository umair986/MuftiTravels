"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FiShield } from "react-icons/fi";

const logos = [
  { src: "/Airlines/partner1.png", name: "Saudia Airlines" },
  { src: "/Airlines/partner2.png", name: "Emirates" },
  { src: "/Airlines/partner3.png", name: "Flynas" },
  { src: "/Airlines/partner4.png", name: "Air India" },
];

const scrollVariants = {
  animate: {
    x: ["0%", "-50%"],
    transition: {
      x: {
        duration: 22,
        repeat: Infinity,
        ease: "linear",
      },
    },
  },
};

const AffiliatedPartners = () => {
  return (
    <section className="bg-white pt-16 pb-12 sm:pt-20 sm:pb-14 border-y border-stone-200/80 overflow-hidden relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#D4AF37]/30 text-stone-600 text-xs font-semibold uppercase tracking-wider mb-2">
          <FiShield className="text-[#D4AF37]" />
          <span>Official Airline & Hospitality Partners</span>
        </div>
        <p className="text-xs sm:text-sm text-stone-500 font-body">
          We partner exclusively with certified international carriers and 5-star hotel conglomerates across the Kingdom of Saudi Arabia.
        </p>
      </div>

      {/* Infinite Smooth Logo Carousel */}
      <div className="overflow-hidden w-full relative [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
        <motion.div
          className="flex w-[200%] items-center"
          variants={scrollVariants}
          animate="animate"
        >
          {[...logos, ...logos, ...logos, ...logos].map((partner, index) => (
            <div
              key={index}
              className="w-1/8 min-w-[160px] sm:min-w-[200px] flex items-center justify-center px-8 py-2 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={partner.src}
                alt={partner.name}
                width={150}
                height={70}
                className="h-12 w-auto object-contain max-h-12"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AffiliatedPartners;
