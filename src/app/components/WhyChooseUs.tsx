"use client";

import { motion } from "framer-motion";
import { FaPlane, FaUserTie, FaTags, FaHeadset } from "react-icons/fa";

const features = [
  {
    icon: <FaPlane size={40} className="text-blue-500" />,
    title: "Booking On The Go",
    desc: "We offer easy and convenient flight bookings with attractive offers.",
  },
  {
    icon: <FaUserTie size={40} className="text-blue-500" />,
    title: "Travel Expert",
    desc: "Personalized recommendations and support from experienced travel experts.",
  },
  {
    icon: <FaTags size={40} className="text-blue-500" />,
    title: "Amazing Deals",
    desc: "Exciting deals on flights, hotels, car rentals, and tour packages.",
  },
  {
    icon: <FaHeadset size={40} className="text-blue-500" />,
    title: "24/7 Support",
    desc: "Get assistance 24/7 on any kind of travel-related query.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="bg-blue-50 py-16 px-4 md:px-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Why Choose Us</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          When you book with us, you know you're booking with the best in the
          business.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
            className="bg-white p-6 rounded-xl shadow-md text-center"
          >
            <div className="mb-4 flex justify-center">{item.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default WhyChooseUs;
