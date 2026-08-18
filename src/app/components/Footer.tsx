"use client";

import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa";
import { FiPhone, FiMapPin, FiShield } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-[#040C13] text-stone-300 border-t border-[#D4AF37]/25 relative overflow-hidden">
      {/* Background Subtle Geometry */}
      <div className="absolute inset-0 islamic-pattern-dark opacity-20 pointer-events-none" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Col 1: Brand & Bio (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-white/10 border border-[#D4AF37]/30">
                <Image
                  src="/Logo.png"
                  alt="Mufti Travels"
                  height={55}
                  width={140}
                  className="h-12 w-auto object-contain"
                />
              </div>
              <div>
                <p className="font-serif text-lg font-bold text-white tracking-wider">
                  MUFTI <span className="text-[#D4AF37]">TRAVELS</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#F3E5AB]">
                  Sacred Pilgrimages
                </p>
              </div>
            </Link>

            <p className="text-stone-400 font-body text-xs sm:text-sm leading-relaxed max-w-sm">
              Providing devout Muslim pilgrims with world-class, spiritual, and comfortable Hajj, Umrah, and Ziyarat experiences. Certified MoFA authorized partner with 15+ years of trusted service.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://www.instagram.com/mufti.travels/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] flex items-center justify-center text-stone-300 transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61555597319380"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] flex items-center justify-center text-stone-300 transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/919323063712"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white flex items-center justify-center text-emerald-400 transition-colors"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Curated Packages (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <p className="font-serif text-base font-bold text-white tracking-wide border-b border-[#D4AF37]/20 pb-2">
              Curated Packages
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-400">
              <li>
                <Link href="/packages/umrah-fixed-group/mumbai" className="hover:text-[#D4AF37] transition-colors">
                  15 Days Umrah from Mumbai
                </Link>
              </li>
              <li>
                <Link href="/packages/umrah-fixed-group/delhi" className="hover:text-[#D4AF37] transition-colors">
                  15 Days Umrah from Delhi
                </Link>
              </li>
              <li>
                <Link href="/packages/umrah-fixed-group/lucknow" className="hover:text-[#D4AF37] transition-colors">
                  15 Days Umrah from Lucknow
                </Link>
              </li>
              <li>
                <Link href="/packages/umrah-land-package/14-days-umrah-land-package" className="hover:text-[#D4AF37] transition-colors">
                  14 Days Umrah Land Package
                </Link>
              </li>
              <li>
                <Link href="/packages/umrah-land-package/30-days-super-saver-land-package" className="hover:text-[#D4AF37] transition-colors">
                  30 Days Super Saver Land
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Links & Resources (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <p className="font-serif text-base font-bold text-white tracking-wide border-b border-[#D4AF37]/20 pb-2">
              Pilgrim Links
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-400">
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("about");
                    if (el) {
                      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
                      window.scrollTo({ top: offset, behavior: "smooth" });
                    }
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#why-us"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("why-us");
                    if (el) {
                      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
                      window.scrollTo({ top: offset, behavior: "smooth" });
                    }
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Why Mufti Travels
                </a>
              </li>
              <li>
                <a
                  href="#journey"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("journey");
                    if (el) {
                      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
                      window.scrollTo({ top: offset, behavior: "smooth" });
                    }
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Spiritual Blueprint
                </a>
              </li>
              <li>
                <a
                  href="#gallery"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("gallery");
                    if (el) {
                      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
                      window.scrollTo({ top: offset, behavior: "smooth" });
                    }
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Sacred Gallery
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("contact");
                    if (el) {
                      const offset = el.getBoundingClientRect().top + window.pageYOffset - 90;
                      window.scrollTo({ top: offset, behavior: "smooth" });
                    }
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Enquire Now
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Office (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <p className="font-serif text-base font-bold text-white tracking-wide border-b border-[#D4AF37]/20 pb-2">
              Mumbai Office
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm text-stone-400">
              <p className="flex items-start gap-2">
                <FiMapPin className="text-[#D4AF37] w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>A/57 Madni Complex, Bandra East, Mumbai - 400051, India</span>
              </p>
              <p className="flex items-center gap-2">
                <FiPhone className="text-[#D4AF37] w-4 h-4 flex-shrink-0" />
                <a href="tel:+919323063712" className="text-white font-semibold hover:text-[#D4AF37]">
                  +91 93230 63712
                </a>
              </p>
              <p className="flex items-center gap-2">
                <FaWhatsapp className="text-emerald-400 w-4 h-4 flex-shrink-0" />
                <a href="https://wa.me/919323063712" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                  24/7 WhatsApp Hotline
                </a>
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-[#F3E5AB] bg-white/5 border border-[#D4AF37]/20 px-2.5 py-1 rounded-full">
                  <FiShield className="w-3 h-3 text-[#D4AF37]" />
                  <span>MoFA Authorized & Verified</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar & Copyright */}
        <div className="mt-14 pt-6 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Mufti Travels. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>May Allah accept all your sacred prayers & pilgrimages.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
