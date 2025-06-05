"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const logos = [
  "/partner1.png",
  "/partner2.png",
  "/partner3.png",
  "/partner4.png",
];

const scrollVariants = {
  animate: {
    x: ["0%", "-100%"],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: "loop",
        duration: 20,
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
      <div className="relative w-full overflow-hidden">
        <motion.div
          className="flex gap-10 w-max"
          variants={scrollVariants}
          animate="animate"
        >
          {[...logos, ...logos].map((logo, index) => (
            <div key={index} className="min-w-[150px] flex-shrink-0">
              <Image
                src={logo}
                alt={`Partner ${index + 1}`}
                width={150}
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
