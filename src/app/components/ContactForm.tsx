"use client";

import { Input } from "../components/ui/input";
import { useState, FormEvent } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    adults: 1,
    children: 0,
    date: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null
  );
  const [submitMessage, setSubmitMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updateCount = (field: "adults" | "children", change: number) => {
    setFormData((prev) => {
      const newValue = Math.max(0, Number(prev[field]) + change);
      // Prevent adults from being less than 1
      if (field === "adults" && newValue < 1) return prev;
      return { ...prev, [field]: newValue };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      const response = await fetch("/api/send-enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      setSubmitStatus("success");
      setSubmitMessage("Thank you! Your enquiry has been sent.");
      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        adults: 1,
        children: 0,
        date: "",
      });
    } catch (error) {
      console.error("Failed to send enquiry:", error);
      setSubmitStatus("error");
      setSubmitMessage("Failed to send enquiry. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-2xl font-bold text-green-800">Enquiry Sent!</h2>
        <p className="mt-2 text-green-700">{submitMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        className="w-full border border-gray-300 p-3 rounded-md bg-white text-black placeholder-gray-500"
        required
      />

      <Input
        placeholder="Email"
        name="email"
        type="email"
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

      <Input
        placeholder="dd-mm-yyyy"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        className="w-full border border-gray-300 bg-white p-3 rounded-md text-black placeholder-gray-500"
        required
      />

      {submitStatus === "error" && (
        <p className="text-red-600 text-sm">{submitMessage}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white font-medium py-3 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
