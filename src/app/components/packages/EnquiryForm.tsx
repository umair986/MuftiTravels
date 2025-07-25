"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { FaPlus, FaMinus, FaRegCalendarAlt, FaTimes } from "react-icons/fa";

interface EnquiryFormProps {
  pkgName: string;
  onClose: () => void;
}

export const EnquiryForm = ({ pkgName, onClose }: EnquiryFormProps) => {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleAdultsChange = (amount: number) => {
    setAdults((prev) => Math.max(1, prev + amount));
  };
  const handleChildrenChange = (amount: number) => {
    setChildren((prev) => Math.max(0, prev + amount));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");
    // This is where you would call your API route
    // For now, we simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitMessage(
      "Thank you for your enquiry! Our team will get in touch with you shortly."
    );
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <FaTimes size={20} />
        </button>
        <div className="p-6 sm:p-8">
          <div className="text-left mb-6">
            <p className="text-sm font-medium text-[#f8ac0d]">
              Fill in your details,
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092638]">
              Our team will get in touch!
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enquiring for: <span className="font-semibold">{pkgName}</span>
            </p>
          </div>
          {submitMessage ? (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-green-600">
                {submitMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <input
                type="tel"
                placeholder="Phone-no"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
              />
              <div>
                <p className="font-semibold text-gray-700 mb-2">
                  Number of Passengers:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Adults</label>
                    <div className="flex items-center border border-gray-300 rounded-lg p-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(-1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaMinus />
                      </button>
                      <span className="flex-grow text-center font-semibold text-lg">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Children (below 12 years)
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg p-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(-1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaMinus />
                      </button>
                      <span className="flex-grow text-center font-semibold text-lg">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChildrenChange(1)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => (e.target.type = "text")}
                  placeholder="dd-mm-yyyy"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f8ac0d]"
                />
                <FaRegCalendarAlt className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-gray-400"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
