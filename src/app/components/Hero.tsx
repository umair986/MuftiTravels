import Image from "next/image";

export default function Hero() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "calc(var(--vh, 100vh) * 100)" }}
    >
      {/* ✅ Correct image path */}
      <Image
        src="/hero4.png"
        alt="Hero Background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10" />

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 text-white z-20 mt-[-40px] md:mt-[-60px]">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Begin Your Sacred Journey with Mufti Travels
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-xl">
          Expertly crafted Hajj & Umrah experiences with complete peace of mind.
        </p>
        <a href="#contact">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-6 rounded">
            Enquire Now
          </button>
        </a>
      </div>
    </div>
  );
}
