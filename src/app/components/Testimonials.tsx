"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";
import Image from "next/image";

const testimonials = [
  {
    name: "Ahmed Khan",
    photo: "/user1.jpg",
    quote:
      "Mufti Travels gave us the best Hajj experience. Everything was smooth and well-organized.",
  },
  {
    name: "Fatima Ansari",
    photo: "/user2.jpg",
    quote:
      "Alhamdulillah, it was an amazing Umrah trip. Highly recommend their services.",
  },
  {
    name: "Imran Sheikh",
    photo: "/user3.jpg",
    quote:
      "Very professional and supportive team. I would travel with them again.",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-blue-50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-800">
          What Our Guests Say
        </h2>
        <p className="text-gray-600 mt-2">Real stories from happy pilgrims.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-8 px-6">
        {testimonials.map((t, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="w-80 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6 text-center">
              <div className="flex justify-center mb-4">
                <Image
                  src={t.photo}
                  alt={t.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
              </div>
              <CardContent>
                <p className="text-gray-700 italic mb-3">
                  {" "}
                  &ldquo;{t.quote}&rdquo;
                </p>
                <h4 className="text-lg font-semibold text-blue-700">
                  {t.name}
                </h4>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
