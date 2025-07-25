"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";

export default function Offers() {
  const router = useRouter();

  // In a real app, you might fetch this data from an API
  const specialOffer = {
    title: "Offer for more than 8 People",
    description: "from Mumbai & Delhi in Via/Direct flight",
    price: "₹71,786",
    image: "/packages/umrah/umrah1.jpeg", // Make sure you have an image at this path in your public folder
    slug: "/packages/umrah-fixed-group/15-days-regular-umrah-from-mumbai", // Example link
  };

  return (
    <section className="bg-gradient-to-b from-blue-50 via-white to-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-2">
          Special Offers
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[#092638]">
          Offers To Inspire You
        </h2>
      </div>

      <div className="max-w-5xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8">
        {/* Special Offer Card */}
        <div className="bg-blue-600 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row items-center p-6 sm:p-0 transform hover:scale-105 transition-transform duration-300">
          <div className="sm:w-1/2 text-left p-4 sm:pl-8">
            <span className="text-sm font-semibold opacity-80">
              Special Offer
            </span>
            <h3 className="text-xl font-bold mt-1">{specialOffer.title}</h3>
            <p className="text-sm mt-1 opacity-80">
              {specialOffer.description}
            </p>
            <p className="text-2xl font-bold mt-4">
              {specialOffer.price}
              <span className="text-sm font-normal opacity-80">
                {" "}
                /Per Person
              </span>
            </p>
            <button
              onClick={() => router.push(specialOffer.slug)}
              className="mt-6 bg-white text-blue-600 font-bold py-3 px-6 rounded-lg transition-colors duration-300 hover:bg-blue-100 flex items-center gap-2"
            >
              Book Now <FaArrowRight />
            </button>
          </div>
          <div className="sm:w-1/2 w-full mt-6 sm:mt-0 h-64 sm:h-full">
            <Image
              src={specialOffer.image}
              alt="Special Offer"
              width={400}
              height={400}
              className="w-full h-full object-cover sm:rounded-r-3xl"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/400x400/1E40AF/FFFFFF?text=Offer";
              }}
            />
          </div>
        </div>

        {/* No Offer Card */}
        <div className="bg-orange-500 text-white rounded-3xl shadow-2xl flex flex-col justify-between p-8 text-left">
          <div>
            <span className="inline-block bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">
              No Offer
            </span>
          </div>
          <div className="text-center my-8">
            <h3 className="text-2xl font-bold">Get Special Offer</h3>
            <p className="mt-1 opacity-80">No Offer Available</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xl font-bold">
              ₹N/A
              <span className="text-sm font-normal opacity-80">
                {" "}
                /Per Person
              </span>
            </p>
            <button className="bg-white/20 text-white font-bold py-3 px-5 rounded-lg flex items-center gap-2 cursor-not-allowed">
              Book Now <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
