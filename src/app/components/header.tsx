"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FiMenu, FiX, FiPhone, FiCompass, FiShield } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

/**
 * The header's one call to action. WhatsApp is where enquiries actually get
 * answered, so the button says so rather than scrolling to the form — the
 * form is still reachable from the footer and the contact section itself.
 */
const WHATSAPP_ENQUIRY_URL =
  "https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20Umrah%20packages.";

const Header = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setNavOpen(!navOpen);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Curated Packages", href: "/packages" },
    { name: "About Us", href: "/#about" },
    { name: "Gallery", href: "/gallery" },
    { name: "Guides", href: "/guides" },
  ];

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    // Section links are written as "/#id" so they navigate home from any page.
    // Only intercept for smooth scrolling when the section is already on screen;
    // otherwise let Next handle the navigation and the browser handle the hash.
    if (href.startsWith("/#")) {
      const targetId = href.slice(2);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 90;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
      if (navOpen) {
        setNavOpen(false);
      }
    } else if (href === "/") {
      if (window.location.pathname === "/") {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        if (navOpen) {
          setNavOpen(false);
        }
      }
    }
  };

  // The admin area is its own surface with its own sidebar chrome (AdminShell).
  // The marketing header is both irrelevant there and, being sticky z-50, would
  // sit on top of the sidebar. Placed after the hooks above so hook order holds.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Top Banner: Official Certification & Hotline */}
      <div className="bg-[#040C13] border-b border-[#D4AF37]/15 text-xs text-stone-300 py-1.5 px-4 sm:px-8 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-[#E5C058]">
              <FiShield className="w-3.5 h-3.5" />
              <span className="font-medium tracking-wide">
                Government Authorized Umrah Operator
              </span>
            </span>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">
              Direct Flights from Mumbai, Delhi & Lucknow
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-stone-300">Pilgrim Advisors Online</span>
            </div>
            <a
              href="tel:+919323063712"
              className="flex items-center gap-1.5 text-stone-200 hover:text-[#D4AF37] transition-colors"
            >
              <FiPhone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-medium">+91 93230 63712</span>
            </a>
            <a
              href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20Umrah%20packages."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <FaWhatsapp className="w-3.5 h-3.5" />
              <span>WhatsApp Chat</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#06131D]/95 backdrop-blur-md shadow-2xl border-b border-[#D4AF37]/25 py-2.5"
            : "bg-[#06131D]/90 backdrop-blur-sm border-b border-[#D4AF37]/15 py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={(e) => handleSmoothScroll(e, "/")}
            className="flex items-center gap-3 group"
          >
            <div className="relative overflow-hidden rounded-lg p-1 bg-gradient-to-br from-white/10 to-transparent border border-[#D4AF37]/20 group-hover:border-[#D4AF37]/50 transition-colors">
              <Image
                src="/Logo.png"
                alt="Mufti Travels - Sacred Pilgrimage Experiences"
                width={130}
                height={50}
                className="h-10 sm:h-12 w-auto object-contain"
                priority
              />
            </div>
            <div className="hidden lg:block text-left">
              <p className="font-serif text-lg font-bold tracking-wider text-white leading-none">
                MUFTI <span className="text-[#D4AF37]">TRAVELS</span>
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 font-medium mt-1">
                Hajj &bull; Umrah &bull; Ziyarat
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium text-stone-200 hover:text-[#E5C058] hover:bg-white/5 transition-all duration-200 relative group cursor-pointer"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#D4AF37] group-hover:w-3/5 transition-all duration-300 rounded-full" />
              </Link>
            ))}
          </nav>

          {/* Action CTA */}
          <div className="hidden md:flex items-center">
            <a
              href={WHATSAPP_ENQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 lg:px-5 py-2 rounded-full font-semibold text-xs lg:text-sm text-white bg-[#25D366] hover:bg-[#1EBE5A] shadow-lg hover:shadow-[#25D366]/25 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Enquire Now</span>
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href={WHATSAPP_ENQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-[#25D366] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Enquire Now</span>
            </a>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-stone-200 hover:text-[#D4AF37] hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle Menu"
            >
              {navOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {navOpen && (
          <div className="md:hidden bg-[#06131D]/98 backdrop-blur-xl border-b border-[#D4AF37]/20 px-6 py-6 animate-in slide-in-from-top duration-300">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className="px-4 py-2.5 rounded-lg text-stone-200 hover:text-[#E5C058] hover:bg-white/5 font-medium text-base transition-colors flex items-center justify-between border-b border-white/5 cursor-pointer"
                >
                  <span>{link.name}</span>
                  <span className="text-stone-600 text-xs">→</span>
                </Link>
              ))}

              <div className="pt-4 flex flex-col gap-3">
                <a
                  href="tel:+919323063712"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-700 text-stone-200 hover:bg-white/5 transition-colors font-medium text-sm"
                >
                  <FiPhone className="text-[#D4AF37]" />
                  <span>Call +91 93230 63712</span>
                </a>
                <Link
                  href="/#contact"
                  onClick={(e) => handleSmoothScroll(e, "/#contact")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl gold-gradient-bg text-[#06131D] font-bold text-sm shadow-md cursor-pointer"
                >
                  <span>Plan Your Sacred Journey</span>
                  <FiCompass />
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
