"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FiArrowRight,
  FiChevronDown,
  FiCompass,
  FiMenu,
  FiPhone,
  FiShield,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { DEPARTURE_CITIES, cityPath } from "@/lib/departures";

/**
 * The header's one call to action. WhatsApp is where enquiries actually get
 * answered, so the button says so rather than scrolling to the form — the
 * form is still reachable from the footer and the contact section itself.
 */
const WHATSAPP_ENQUIRY_URL =
  "https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20Umrah%20packages.";

/**
 * The Packages menu. Umrah is browsed by departure city because Umrah packages
 * are made per city per month (docs/monthly-packages.md) and the city pages
 * are the addresses that last; the categories that are not monthly sit beside
 * them, and the full catalogue is last for anyone who wants everything.
 */
const CITY_LINKS = DEPARTURE_CITIES.map((city) => ({
  key: city.key,
  name: city.name,
  href: cityPath(city.key),
}));

const CATEGORY_LINKS = [
  { name: "Ramadan Umrah", href: `/packages/${CATEGORY_SLUGS.Ramzan}` },
  { name: "Hajj", href: `/packages/${CATEGORY_SLUGS.Hajj}` },
  {
    name: "Land packages",
    href: `/packages/${CATEGORY_SLUGS["Umrah Land Package"]}`,
  },
  { name: "Umrah + Ziyarat", href: `/packages/${CATEGORY_SLUGS.Ziyarat}` },
];

/** How long the pointer may be outside the menu before it closes. */
const HOVER_CLOSE_MS = 150;

const Header = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [mobilePackagesOpen, setMobilePackagesOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const packagesButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

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

  // Any navigation closes every menu. Before this, a tap on "Gallery" in the
  // phone menu changed the page underneath and left the menu open over it —
  // only the home and "/#section" links closed it, by hand.
  useEffect(() => {
    setNavOpen(false);
    setPackagesOpen(false);
    setMobilePackagesOpen(false);
  }, [pathname]);

  // Desktop menu: a click anywhere else or Escape closes it. Escape hands
  // focus back to the button so a keyboard user is not left nowhere.
  useEffect(() => {
    if (!packagesOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setPackagesOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPackagesOpen(false);
        packagesButtonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [packagesOpen]);

  // Phone menu: Escape closes it too.
  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const toggleMenu = () => setNavOpen(!navOpen);

  /**
   * Hover opens the menu for a MOUSE only. On a touch screen the browser fires
   * pointerenter and then click for the same tap; acting on both would open
   * the menu and immediately close it again — the classic tablet dropdown bug.
   * Touch and pen go through the click toggle alone.
   */
  function onMenuPointerEnter(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPackagesOpen(true);
  }

  function onMenuPointerLeave(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(
      () => setPackagesOpen(false),
      HOVER_CLOSE_MS,
    );
  }

  const isPackagesSection =
    pathname?.startsWith("/packages") ||
    pathname?.startsWith("/umrah-packages-from-");

  const navLinks = [
    { name: "Home", href: "/" },
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

  // Colour is left out of the shared class and added per link: two text
  // colours on one element is decided by stylesheet order, not by which was
  // written last, and the active one lost.
  const desktopLinkClass =
    "px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium hover:text-[#E5C058] hover:bg-white/5 transition-all duration-200 relative group cursor-pointer";

  const renderDesktopLink = (link: { name: string; href: string }) => (
    <Link
      key={link.name}
      href={link.href}
      onClick={(e) => handleSmoothScroll(e, link.href)}
      className={`${desktopLinkClass} text-stone-200`}
    >
      {link.name}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#D4AF37] group-hover:w-3/5 transition-all duration-300 rounded-full" />
    </Link>
  );

  const renderMobileLink = (link: { name: string; href: string }) => (
    <Link
      key={link.name}
      href={link.href}
      onClick={(e) => handleSmoothScroll(e, link.href)}
      className="px-4 py-2.5 rounded-lg text-stone-200 hover:text-[#E5C058] hover:bg-white/5 font-medium text-base transition-colors flex items-center justify-between border-b border-white/5 cursor-pointer"
    >
      <span>{link.name}</span>
      <span className="text-stone-600 text-xs">→</span>
    </Link>
  );

  return (
    <>
      {/* Top Banner: Official Certification & Hotline */}
      <div className="bg-[#040C13] border-b border-[#D4AF37]/15 text-xs text-stone-300 py-1.5 px-4 sm:px-8 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-[#E5C058]">
              <FiShield className="w-3.5 h-3.5" />
              <span className="font-medium tracking-wide whitespace-nowrap">
                Government Authorized Umrah Operator
              </span>
            </span>
            {/* The two secondary notes wait for lg: at tablet width the
                banner wrapped onto three lines with them in. */}
            <span className="hidden lg:inline text-stone-500">|</span>
            <span className="hidden lg:inline text-stone-400">
              Direct Flights from Mumbai, Delhi & Lucknow
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden lg:flex items-center gap-2">
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
              <span className="font-medium whitespace-nowrap">+91 93230 63712</span>
            </a>
            <a
              href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20enquire%20about%20Umrah%20packages."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <FaWhatsapp className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">WhatsApp Chat</span>
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

          {/* Desktop Navigation Links. `relative` so the Packages panel
              centres on the nav rather than on its button, which keeps it on
              screen at the narrowest desktop width. */}
          <nav className="relative hidden md:flex items-center space-x-1 lg:space-x-2">
            {renderDesktopLink(navLinks[0])}

            <div
              ref={menuRef}
              onPointerEnter={onMenuPointerEnter}
              onPointerLeave={onMenuPointerLeave}
            >
              <button
                ref={packagesButtonRef}
                type="button"
                onClick={() => setPackagesOpen((open) => !open)}
                aria-expanded={packagesOpen}
                aria-controls="packages-menu"
                className={`${desktopLinkClass} inline-flex items-center gap-1 ${
                  isPackagesSection || packagesOpen
                    ? "text-[#E5C058]"
                    : "text-stone-200"
                }`}
              >
                Packages
                <FiChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    packagesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {packagesOpen && (
                // The pt-3 is the hover bridge: padding, not margin, so the
                // pointer crossing from the button to the panel never leaves
                // the menu and never starts the close timer.
                <div
                  id="packages-menu"
                  className="absolute left-1/2 top-full z-50 w-[34rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 pt-3"
                >
                  <div className="grid grid-cols-2 gap-6 rounded-2xl border border-[#D4AF37]/30 bg-[#06131D] p-5 shadow-2xl">
                    <div>
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                        Umrah by departure city
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {CITY_LINKS.map((city) => (
                          <li key={city.key}>
                            <Link
                              href={city.href}
                              onClick={() => setPackagesOpen(false)}
                              aria-current={
                                pathname === city.href ? "page" : undefined
                              }
                              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-stone-200 transition hover:bg-white/5 hover:text-[#E5C058]"
                            >
                              <span>{city.name}</span>
                              {city.key === "mumbai" ? (
                                <span className="rounded-full border border-[#D4AF37]/40 px-2 py-0.5 text-[10px] font-semibold text-[#F3E5AB]">
                                  Home city
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col">
                      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                        Other packages
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {CATEGORY_LINKS.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setPackagesOpen(false)}
                              className="block rounded-lg px-2 py-2 text-sm text-stone-200 transition hover:bg-white/5 hover:text-[#E5C058]"
                            >
                              {link.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/packages"
                        onClick={() => setPackagesOpen(false)}
                        className="mt-auto inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 px-3 py-2 text-sm font-semibold text-[#F3E5AB] transition hover:border-[#D4AF37] hover:bg-white/5"
                      >
                        All packages <FiArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {navLinks.slice(1).map(renderDesktopLink)}
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
              aria-label={navOpen ? "Close menu" : "Open menu"}
              aria-expanded={navOpen}
              aria-controls="mobile-menu"
            >
              {navOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer. Capped at the space below the header and
            scrollable inside itself: with Packages expanded it is taller than
            a small phone, and without the cap the bottom links — the phone
            number among them — were unreachable. */}
        {navOpen && (
          <div
            id="mobile-menu"
            className="md:hidden max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain bg-[#06131D]/98 backdrop-blur-xl border-b border-[#D4AF37]/20 px-6 py-6 animate-in slide-in-from-top duration-300"
          >
            <div className="flex flex-col space-y-3">
              {renderMobileLink(navLinks[0])}

              <div className="border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setMobilePackagesOpen((open) => !open)}
                  aria-expanded={mobilePackagesOpen}
                  aria-controls="mobile-packages"
                  className={`w-full px-4 py-2.5 rounded-lg hover:bg-white/5 font-medium text-base transition-colors flex items-center justify-between cursor-pointer ${
                    isPackagesSection ? "text-[#E5C058]" : "text-stone-200"
                  }`}
                >
                  <span>Packages</span>
                  <FiChevronDown
                    className={`h-4 w-4 text-stone-500 transition-transform duration-200 ${
                      mobilePackagesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mobilePackagesOpen && (
                  <div id="mobile-packages" className="px-4 pb-4 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                      Umrah by departure city
                    </p>
                    {/* Two columns: six cities in three short rows instead of
                        six long ones. Each cell is a full 44px-tall tap target. */}
                    <ul className="mt-2 grid grid-cols-2 gap-2">
                      {CITY_LINKS.map((city) => (
                        <li key={city.key}>
                          <Link
                            href={city.href}
                            onClick={() => setNavOpen(false)}
                            className="flex min-h-11 items-center rounded-lg border border-white/10 px-3 text-sm text-stone-200 transition hover:border-[#D4AF37]/50 hover:text-[#E5C058]"
                          >
                            {city.name}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                      Other packages
                    </p>
                    <ul className="mt-2 grid grid-cols-2 gap-2">
                      {CATEGORY_LINKS.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setNavOpen(false)}
                            className="flex min-h-11 items-center rounded-lg border border-white/10 px-3 text-sm text-stone-200 transition hover:border-[#D4AF37]/50 hover:text-[#E5C058]"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/packages"
                      onClick={() => setNavOpen(false)}
                      className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/40 text-sm font-semibold text-[#F3E5AB]"
                    >
                      All packages <FiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {navLinks.slice(1).map(renderMobileLink)}

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
