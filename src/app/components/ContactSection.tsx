"use client";

import ContactForm from "./ContactForm";

export default function ContactSection() {
  return (
    <section className="mt-20" id="contact">
      {/* Heading */}
      <div className="mb-8 text-center px-4">
        <h2 className="text-3xl font-bold text-[#092638]">Contact Us</h2>
        <p className="text-[#f8ac0d] mt-1 text-sm">
          We’re here to help you plan your perfect journey
        </p>
      </div>

      {/* Content */}
      <div className="relative w-full h-auto md:h-[600px] grid grid-cols-1 md:grid-cols-2">
        {/* Left Map Section */}
        <div className="relative h-64 md:h-auto">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d942.797227481456!2d72.84293416954392!3d19.05543006650086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c923b0543ed1%3A0x7fba5dc35363fd9a!2sNational%20Girl&#39;s%20High%20School%20%26%20Junior%20College!5e0!3m2!1sen!2sin!4v1749732890489!5m2!1sen!2sin"
            width="100%"
            height="100%"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-0"
          ></iframe>
        </div>

        {/* Right Form Section */}
        <div className="bg-white px-6 py-10 md:px-16 flex items-center justify-center transition-shadow duration-300 hover:shadow-lg">
          <div className="w-full max-w-md">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
