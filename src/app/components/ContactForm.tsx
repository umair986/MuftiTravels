"use client";

import { useState, FormEvent } from "react";
import {
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiCheckCircle,
  FiSend,
  FiMapPin,
} from "react-icons/fi";
import { FaWhatsapp, FaKaaba } from "react-icons/fa";
import CustomDropdown, { DropdownOption } from "./ui/CustomDropdown";
import { createClient } from "@/lib/supabase/client";

const cityOptions: DropdownOption[] = [
  { value: "Mumbai", label: "Mumbai (Direct)", badge: "BOM" },
  { value: "Delhi", label: "Delhi (Direct)", badge: "DEL" },
  { value: "Lucknow", label: "Lucknow (Direct)", badge: "LKO" },
  { value: "Bengaluru", label: "Bengaluru", badge: "BLR" },
  { value: "Hyderabad", label: "Hyderabad", badge: "HYD" },
  { value: "Other", label: "Other City", badge: "Connecting" },
];

const packagePreferenceOptions: DropdownOption[] = [
  {
    value: "Umrah Fixed Group",
    label: "15 Days Fixed Group",
    badge: "Popular",
  },
  { value: "Umrah Land Package", label: "Umrah Land Package (Hotel Only)" },
  { value: "Ramadan Special", label: "Ramadan Special", badge: "Early Bird" },
  { value: "VIP Custom Suite", label: "Custom VIP Family Suite", badge: "VIP" },
  { value: "Ziyarat Combo", label: "Umrah + Ziyarat (Turkey/Dubai)" },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    departureCity: "Mumbai",
    adults: 2,
    children: 0,
    date: "",
    packagePreference: "Umrah Fixed Group",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null,
  );
  const [submitMessage, setSubmitMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDropdownChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCount = (field: "adults" | "children", change: number) => {
    setFormData((prev) => {
      const newValue = Math.max(0, Number(prev[field]) + change);
      if (field === "adults" && newValue < 1) return prev;
      return { ...prev, [field]: newValue };
    });
  };

  const generateWhatsAppUrl = () => {
    const text = `As-salamu alaykum Mufti Travels Team,%0A%0AI would like to enquire about an Umrah package:%0A• Name: ${formData.name || "Pilgrim"}%0A• Phone: ${formData.phone || "N/A"}%0A• Departure City: ${formData.departureCity}%0A• Package Type: ${formData.packagePreference}%0A• Passengers: ${formData.adults} Adults, ${formData.children} Children%0A• Travel Date: ${formData.date || "Next Available"}%0A%0APlease provide available dates and pricing.`;
    return `https://wa.me/919323063712?text=${text}`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured");

      const { error } = await supabase.from("enquiries").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        departure_city: formData.departureCity,
        package_preference: formData.packagePreference,
        adults: formData.adults,
        children: formData.children,
        preferred_date: formData.date || null,
        notes: formData.notes,
      });

      if (error) throw error;

      setSubmitStatus("success");
      setSubmitMessage(
        "JazakAllah Khair! Your enquiry has been received. Our Chief Pilgrim Advisor will contact you within 2 hours.",
      );
      setFormData({
        name: "",
        phone: "",
        email: "",
        departureCity: "Mumbai",
        adults: 2,
        children: 0,
        date: "",
        packagePreference: "Umrah Fixed Group",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to save enquiry:", error);
      setSubmitStatus("error");
      setSubmitMessage(
        "Failed to send enquiry. Please try again or message us directly on WhatsApp.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="text-center p-8 bg-[#06131D] border border-[#D4AF37]/50 rounded-3xl shadow-2xl animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full gold-gradient-bg flex items-center justify-center text-[#06131D] mx-auto mb-4">
          <FiCheckCircle className="w-8 h-8" />
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
          Enquiry Received!
        </h3>
        <p className="text-stone-300 font-body text-sm sm:text-base leading-relaxed mb-6">
          {submitMessage}
        </p>
        <a
          href={generateWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all"
        >
          <FaWhatsapp className="w-4 h-4" />
          <span>Chat Instantly on WhatsApp</span>
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <span className="text-xs uppercase tracking-widest text-[#946E19] font-bold">
          Quick Pilgrim Consultation
        </span>
        <h3 className="font-serif text-2xl font-bold text-[#06131D] mt-1">
          Plan Your Sacred Journey
        </h3>
        <p className="text-xs text-stone-500 font-body mt-0.5">
          Fill in your details below for custom dates, hotel preferences, and
          transparent quotes.
        </p>
      </div>

      {/* Name Input */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          Full Name
        </label>
        <div className="relative">
          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            type="text"
            name="name"
            placeholder="e.g. Haji Mohammed Iqbal"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-stone-50/50"
          />
        </div>
      </div>

      {/* Phone & Email Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            WhatsApp / Phone
          </label>
          <div className="relative">
            <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input
              type="tel"
              name="phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-stone-50/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-stone-50/50"
            />
          </div>
        </div>
      </div>

      {/* Custom Dropdown Grid for Departure City & Package Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-2.5 rounded-xl border border-stone-300 bg-stone-50/50">
          <CustomDropdown
            label="Departure City"
            icon={<FiMapPin />}
            options={cityOptions}
            value={formData.departureCity}
            onChange={(val) => handleDropdownChange("departureCity", val)}
          />
        </div>

        <div className="p-2.5 rounded-xl border border-stone-300 bg-stone-50/50">
          <CustomDropdown
            label="Package Preference"
            icon={<FaKaaba />}
            options={packagePreferenceOptions}
            value={formData.packagePreference}
            onChange={(val) => handleDropdownChange("packagePreference", val)}
          />
        </div>
      </div>

      {/* Passengers Count Selector */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          Number of Passengers
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Adults */}
          <div className="flex items-center justify-between p-2 rounded-xl border border-stone-300 bg-stone-50/50">
            <span className="text-xs font-medium text-stone-700 pl-1">
              Adults (12+ yrs)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCount("adults", -1)}
                className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center text-sm cursor-pointer"
              >
                -
              </button>
              <span className="font-bold text-sm w-4 text-center">
                {formData.adults}
              </span>
              <button
                type="button"
                onClick={() => updateCount("adults", 1)}
                className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between p-2 rounded-xl border border-stone-300 bg-stone-50/50">
            <span className="text-xs font-medium text-stone-700 pl-1">
              Children (&lt;12 yrs)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCount("children", -1)}
                className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center text-sm cursor-pointer"
              >
                -
              </button>
              <span className="font-bold text-sm w-4 text-center">
                {formData.children}
              </span>
              <button
                type="button"
                onClick={() => updateCount("children", 1)}
                className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approximate Travel Date */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          Preferred Travel Date / Month
        </label>
        <div className="relative">
          <FiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-[#D4AF37] bg-stone-50/50"
          />
        </div>
      </div>

      {submitStatus === "error" && (
        <p className="text-red-600 text-xs font-medium">{submitMessage}</p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-[#06131D] gold-gradient-bg hover:brightness-110 shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <FiSend className="w-4 h-4" />
        <span>
          {isSubmitting ? "Sending Request..." : "Request Detailed Quotation"}
        </span>
      </button>

      {/* Direct WhatsApp Sync Option */}
      <div className="pt-2 text-center">
        <a
          href={generateWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <FaWhatsapp className="w-4 h-4 text-emerald-500" />
          <span>Or Send Details Directly via WhatsApp</span>
        </a>
      </div>
    </form>
  );
}
