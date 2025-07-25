"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const logos = [
  "/Airlines/partner1.png",
  "/Airlines/partner2.png",
  "/Airlines/partner3.png",
  "/Airlines/partner4.png",
];

const scrollVariants = {
  animate: {
    x: ["0%", "-50%"],
    transition: {
      x: {
        duration: 25,
        repeat: Infinity,
        ease: "linear",
      },
    },
  },
};

const AffiliatedPartners = () => {
  return (
    <section className="bg-white py-12 overflow-hidden">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Our Affiliated Partners
        </h2>
      </div>

      <div className="overflow-hidden w-full">
        <motion.div
          className="flex w-[200%]"
          variants={scrollVariants}
          animate="animate"
        >
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="w-1/4 flex items-center justify-center px-6"
            >
              <Image
                src={logo}
                alt={`Partner ${index + 1}`}
                width={140}
                height={80}
                className="object-contain"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AffiliatedPartners;
