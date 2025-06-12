"use client";

import { Input } from "../components/ui/input";
import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    adults: 1,
    children: 0,
    date: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updateCount = (field: "adults" | "children", change: number) => {
    setFormData((prev) => {
      const newValue = Math.max(0, Number(prev[field]) + change);
      return { ...prev, [field]: newValue };
    });
  };

  return (
    <form className="space-y-5">
      <h3 className="text-green-600 font-medium">Fill in your details,</h3>
      <h2 className="text-2xl font-bold text-gray-900">
        Our team will get in touch with you!
      </h2>

      <Input
        placeholder="Your name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        className="w-full border border-gray-300 p-3 rounded-md bg-white text-black placeholder-gray-500"
        required
      />

      <Input
        placeholder="Phone-no"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        className="w-full border border-gray-300 p-3 rounded-md bg-white text-black placeholder-gray-500"
        required
      />

      <Input
        placeholder="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        className="w-full border border-gray-300 p-3 rounded-md bg-white text-black placeholder-gray-500"
        required
      />

      <div>
        <label className="font-semibold block mb-2 text-black">
          Number of Passengers:
        </label>
        <div className="flex gap-4">
          {/* Adults */}
          <div className="flex-1">
            <label className="text-sm block mb-1 text-black">Adults</label>
            <div className="flex items-center border border-gray-300 bg-white rounded-md">
              <button
                type="button"
                onClick={() => updateCount("adults", -1)}
                className="px-3 py-2 text-xl font-bold text-black"
              >
                −
              </button>
              <input
                type="text"
                name="adults"
                value={formData.adults}
                readOnly
                className="w-full text-center bg-white text-black border-l border-r border-gray-200 py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => updateCount("adults", 1)}
                className="px-3 py-2 text-xl font-bold text-black"
              >
                +
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="flex-1">
            <label className="text-sm block mb-1 text-black">
              Children (below 12 years)
            </label>
            <div className="flex items-center border border-gray-300 bg-white rounded-md">
              <button
                type="button"
                onClick={() => updateCount("children", -1)}
                className="px-3 py-2 text-xl font-bold text-black"
              >
                −
              </button>
              <input
                type="text"
                name="children"
                value={formData.children}
                readOnly
                className="w-full text-center bg-white text-black border-l border-r border-gray-200 py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => updateCount("children", 1)}
                className="px-3 py-2 text-xl font-bold text-black"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <Input
        placeholder="dd-mm-yyyy"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        className="w-full border border-gray-300 bg-white p-3 rounded-md text-black placeholder-gray-500"
        required
      />

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition"
      >
        Submit
      </button>
    </form>
  );
}
