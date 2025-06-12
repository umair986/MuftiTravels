"use client";

import { motion, useAnimation } from "framer-motion";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import { useEffect, useRef } from "react";

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

  const startAnimation = () => {
    controls.start({
      x: ["0%", "-50%"], // we show two sets of cards, so scroll only halfway
      transition: {
        repeat: Infinity,
        duration: 30,
        ease: "linear",
      },
    });
  };

  useEffect(() => {
    startAnimation();
  }, []);

  const handleMouseEnter = () => {
    controls.stop();
  };

  const handleMouseLeave = () => {
    startAnimation();
  };

  return (
    <div className="relative overflow-hidden bg-blue-50 py-16">
      <h2 className="text-center text-4xl font-bold text-[#092638]">
        What Our Clients Say
      </h2>
      <p className="text-center text-gray-600 mt-2 mb-10 px-4">
        See how we helped pilgrims with their spiritual journeys
      </p>

      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={containerRef}
      >
        <motion.div className="flex w-max gap-6 px-4" animate={controls}>
          {[...testimonials, ...testimonials].map((testimonial, idx) => (
            <div
              key={idx}
              className="min-w-[300px] md:min-w-[350px] max-w-[350px] bg-white p-6 rounded-2xl shadow-md border border-blue-100 transform transition-all duration-300 hover:scale-105 hover:bg-gradient-to-br hover:from-blue-100 hover:to-white"
            >
              <FaQuoteLeft className="text-blue-500 text-2xl mb-4" />
              <div className="flex gap-1 mb-2">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <FaStar key={i} className="text-yellow-400" />
                  ))}
              </div>
              <p className="text-gray-700 mb-4">"{testimonial.text}"</p>
              <div>
                <h4 className="font-bold text-[#092638]">{testimonial.name}</h4>
                <span className="text-sm text-gray-500">
                  {testimonial.role}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
