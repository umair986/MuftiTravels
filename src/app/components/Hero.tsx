"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import hero1 from "/public/hero1.jpg";
import hero2 from "/public/hero2.png";
import hero3 from "/public/hero3.png";

const images = [hero1, hero2, hero3];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "calc(var(--vh, 100vh) * 100)" }}
    >
      {images.map((img, index) => (
        <Image
          key={index}
          src={img}
          alt={`hero-image-${index}`}
          fill
          priority
          className={`object-cover absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        />
      ))}

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 text-black z-20">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Begin Your Sacred Journey with Mufti Travels
        </h1>
        <p className="text-lg md:text-xl mb-6">
          Expertly crafted Hajj & Umrah experiences with complete peace of mind.
        </p>
        <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-6 rounded">
          Enquire Now
        </button>
      </div>
    </div>
  );
}
