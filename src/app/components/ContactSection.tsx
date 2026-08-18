"use client";

import ContactForm from "./ContactForm";
import { FiMapPin, FiPhone, FiClock } from "react-icons/fi";
import { FaWhatsapp, FaKaaba } from "react-icons/fa";

export default function ContactSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] relative overflow-hidden" id="contact">
      {/* Background Pattern */}
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#946E19] text-xs font-semibold uppercase tracking-wider mb-3">
            <FaKaaba className="w-3.5 h-3.5" />
            <span>Begin Your Sacred Consultation</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#06131D] tracking-tight mb-4">
            Speak with Our <span className="gold-gradient-text italic">Chief Pilgrim Advisor</span>
          </h2>
          <p className="text-stone-600 font-body text-base sm:text-lg leading-relaxed">
            Visit our Mumbai office or connect with us via phone or WhatsApp. We are here to guide you with sincerity and expertise.
          </p>
        </div>

        {/* 2-Column Contact Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Office Details & Embedded Map */}
          <div className="lg:col-span-6 bg-[#06131D] text-white rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-2xl space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#F3E5AB] font-semibold">
                Headquarters
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                Mufti Travels Mumbai
              </h3>
              <p className="text-stone-300 text-sm mt-1">
                Government Approved Hajj & Umrah Tour Operators
              </p>
            </div>

            {/* Quick Contact Cards */}
            <div className="space-y-4 text-sm text-stone-200">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 font-medium">Office Address</p>
                  <p className="font-semibold text-white">
                    A/57 Madni Complex, Bandra East, Mumbai - 400051, Maharashtra, India
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="tel:+919323063712"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                    <FiPhone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-400 font-medium">Direct Line</p>
                    <p className="font-bold text-white text-xs sm:text-sm">+91 93230 63712</p>
                  </div>
                </a>

                <a
                  href="https://wa.me/919323063712"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <FaWhatsapp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-emerald-300 font-medium">WhatsApp Support</p>
                    <p className="font-bold text-white text-xs sm:text-sm">24/7 Available</p>
                  </div>
                </a>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-stone-300 flex items-center justify-center flex-shrink-0">
                  <FiClock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-stone-400 font-medium">Office Consultation Hours</p>
                  <p className="font-medium text-white text-xs">
                    Mon - Sat: 10:00 AM – 8:00 PM (IST) &bull; Sunday by Appointment
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded Google Maps */}
            <div className="h-56 rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-inner relative">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d942.797227481456!2d72.84293416954392!3d19.05543006650086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c923b0543ed1%3A0x7fba5dc35363fd9a!2sNational%20Girl&#39;s%20High%20School%20%26%20Junior%20College!5e0!3m2!1sen!2sin!4v1749732890489!5m2!1sen!2sin"
                width="100%"
                height="100%"
                allowFullScreen
                loading="lazy"
                title="Mufti Travels Office Location"
                className="w-full h-full border-0"
              ></iframe>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl">
            <ContactForm />
          </div>

        </div>

      </div>
    </section>
  );
}
