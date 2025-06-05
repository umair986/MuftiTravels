"use client";

import Image from "next/image";

export default function About() {
  return (
    <section className="w-full px-4 py-12 bg-white" id="about">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10">
        {/* Left - Image */}
        <div className="md:w-1/2 w-full">
          <Image
            src="/about.jpg" // Make sure this image exists in public/
            alt="About Mufti Travels"
            width={600}
            height={400}
            className="rounded-xl shadow-lg object-cover w-full h-auto"
          />
        </div>

        {/* Right - Content */}
        <div className="md:w-1/2 w-full text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-[#092638] mb-4">
            About Mufti Travels
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            At Mufti Travels, we specialize in Hajj and Umrah packages that
            offer spiritual comfort and seamless logistics. With years of
            experience and a dedicated team, we ensure your journey is as smooth
            and fulfilling as possible — so you can focus on your spiritual
            goals while we handle the rest.
          </p>
        </div>
      </div>
    </section>
  );
}
