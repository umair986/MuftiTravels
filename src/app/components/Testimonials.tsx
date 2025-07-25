"use client";

import { motion, useAnimation, useMotionValue } from "framer-motion";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import { useCallback, useEffect, useRef, useState } from "react";

const testimonials = [
  {
    name: "Ahmed Khan",
    role: "Pilgrim from Mumbai",
    text: "Mufti Travels made my Umrah journey so peaceful and organized. From visa to ziyarat, everything was perfectly managed.",
  },
  {
    name: "Fatima Begum",
    role: "Hajj Group Member",
    text: "Truly spiritual and stress-free experience. The guides were extremely knowledgeable and caring throughout the Hajj.",
  },
  {
    name: "Imran Sheikh",
    role: "Family Umrah Package",
    text: "Affordable packages, luxurious stays, and everything as promised. Definitely booking again next year.",
  },
  {
    name: "Zainab Patel",
    role: "Solo Umrah Traveller",
    text: "Even as a solo traveler, I felt safe and supported. Highly recommend Mufti Travels for women travelers.",
  },
];

export default function Testimonials() {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [currentX, setCurrentX] = useState(0);

  const startAnimation = useCallback(() => {
    if (isHovered) return;

    controls.start({
      x: [currentX + "%", "-50%"],
      transition: {
        repeat: Infinity,
        duration: 30 * (1 - Math.abs(currentX) / 50), // Adjust duration based on current position
        ease: "linear",
        repeatType: "loop",
      },
    });
  }, [controls, isHovered, currentX]);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    controls.stop();
    // Get current x position and store it
    const currentValue = x.get();
    setCurrentX(currentValue);
  }, [controls, x]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Resume animation from current position with smooth transition
    const currentValue = x.get();
    setCurrentX(currentValue);

    // Small delay to ensure smooth transition
    setTimeout(() => {
      if (!isHovered) {
        startAnimation();
      }
    }, 100);
  }, [x, isHovered, startAnimation]);

  return (
    <div className="relative overflow-hidden bg-blue-50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-2xl md:text-4xl font-bold text-[#092638] mb-2">
          What Our Clients Say
        </h2>
        <p className="text-center text-gray-600 text-sm md:text-base mb-8 md:mb-10 px-4 max-w-2xl mx-auto">
          See how we helped pilgrims with their spiritual journeys
        </p>

        <div
          className="relative w-full overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          ref={containerRef}
        >
          <motion.div
            className="flex w-max gap-4 md:gap-6 px-4"
            animate={controls}
            style={{ x }}
            transition={{
              type: "tween",
              ease: "easeInOut",
              duration: 0.3,
            }}
          >
            {[...testimonials, ...testimonials].map((testimonial, idx) => (
              <motion.div
                key={idx}
                className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] max-w-[350px] bg-white p-4 md:p-6 rounded-2xl shadow-md border border-blue-100 flex-shrink-0 hover:bg-gradient-to-br hover:from-blue-100 hover:to-white hover:shadow-lg"
                whileHover={{
                  scale: 1.05,
                  y: -5,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  },
                }}
                initial={{ scale: 1, y: 0 }}
                animate={{
                  scale: 1,
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    duration: 0.3,
                  },
                }}
              >
                <FaQuoteLeft className="text-blue-500 text-xl md:text-2xl mb-3 md:mb-4" />
                <div className="flex gap-1 mb-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <FaStar
                        key={i}
                        className="text-yellow-400 text-sm md:text-base"
                      />
                    ))}
                </div>
                <p className="text-gray-700 mb-3 md:mb-4 text-sm md:text-base leading-relaxed">
                  &quot;{testimonial.text}&quot;
                </p>
                <div>
                  <h4 className="font-bold text-[#092638] text-sm md:text-base">
                    {testimonial.name}
                  </h4>
                  <span className="text-xs md:text-sm text-gray-500">
                    {testimonial.role}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Mobile scroll indicator */}
        <div className="flex justify-center mt-6 md:hidden">
          <div className="flex space-x-2">
            {testimonials.map((_, idx) => (
              <div
                key={idx}
                className="w-2 h-2 rounded-full bg-blue-300 opacity-50"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
