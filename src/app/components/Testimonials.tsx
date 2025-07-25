"use client";

import Image from "next/image";
import { FaQuoteLeft, FaStar } from "react-icons/fa";

// Testimonial data with updated avatar paths
const testimonials = [
  {
    name: "Ahmed Khan",
    role: "Pilgrim from Mumbai",
    avatar: "/Mavatar.png",
    text: "Mufti Travels made my Umrah journey so peaceful and organized. From visa to ziyarat, everything was perfectly managed.",
  },
  {
    name: "Fatima Begum",
    role: "Hajj Group Member",
    avatar: "/Favatar.png",
    text: "Truly spiritual and stress-free experience. The guides were extremely knowledgeable and caring throughout the Hajj.",
  },
  {
    name: "Imran Sheikh",
    role: "Family Umrah Package",
    avatar: "/Mavatar.png",
    text: "Affordable packages, luxurious stays, and everything as promised. Definitely booking again next year.",
  },
  {
    name: "Zainab Patel",
    role: "Solo Umrah Traveller",
    avatar: "/Favatar.png",
    text: "Even as a solo traveler, I felt safe and supported. Highly recommend Mufti Travels for women travelers.",
  },
  {
    name: "Yusuf Ali",
    role: "Pilgrim from Delhi",
    avatar: "/Mavatar.png",
    text: "The attention to detail was incredible. From the hotels to the transport, everything was top-notch.",
  },
];

// The Testimonial Card component
const TestimonialCard = ({
  name,
  role,
  text,
  avatar,
}: (typeof testimonials)[0]) => (
  <li className="w-80 sm:w-96 flex-shrink-0">
    <div className="flex flex-col h-full bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl">
      <FaQuoteLeft className="text-indigo-500 text-3xl mb-4" />
      {/* FIX: Replaced raw quotes with HTML entities to resolve the build error */}
      <p className="text-gray-600 mb-5 flex-grow">&quot;{text}&quot;</p>
      <div className="flex items-center mt-auto">
        <Image
          src={avatar}
          alt={name}
          width={50}
          height={50}
          className="rounded-full object-cover mr-4 border-2 border-indigo-100"
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/50x50/E2E8F0/4A5568?text=??";
          }} // Fallback
        />
        <div>
          <h4 className="font-bold text-[#092638]">{name}</h4>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">{role}</span>
            <div className="flex gap-0.5">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <FaStar key={i} className="text-yellow-400 text-xs" />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </li>
);

// The main Testimonials component using CSS animation
export default function Testimonials() {
  return (
    <>
      <style jsx global>{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#092638]">
            Trusted by Pilgrims
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Our commitment to a spiritual and seamless journey, reflected in
            their words.
          </p>
        </div>

        <div className="group relative mt-12 w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <ul className="flex w-max items-stretch gap-6 sm:gap-8 py-4 md:animate-[scroll_40s_linear_infinite] group-hover:[animation-play-state:paused]">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <TestimonialCard
                key={`${testimonial.name}-${index}`}
                {...testimonial}
              />
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
