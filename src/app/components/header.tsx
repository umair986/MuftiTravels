"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiMenu, FiX, FiPhone } from "react-icons/fi"; // 🆕 Import phone icon

const Header = () => {
  const [navOpen, setNavOpen] = useState(false);

  const toggleMenu = () => setNavOpen(!navOpen);

  return (
    <header className="bg-[#092638] text-[#f8ac0d] sticky top-0 z-50 shadow-md py-4 px-6">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center space-x-2">
          <Image
            src="/Logo.png"
            alt="Mufti Travels"
            width={130}
            height={130}
            className="w-[130px] h-auto"
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link
            href="/"
            className="hover:text-white transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            href="#packages"
            className="hover:text-white transition-colors duration-200"
          >
            Packages
          </Link>
          <Link
            href="#about"
            className="hover:text-white transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="#contact"
            className="hover:text-white transition-colors duration-200"
          >
            Contact
          </Link>
          <Link
            href="#gallery"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            Gallery
          </Link>
        </nav>

        {/* Mobile Burger Icon */}
        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {navOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Links */}
      {navOpen && (
        <nav className="md:hidden flex flex-col items-center space-y-4 py-4 bg-[#092638] text-[#f8ac0d]">
          <Link
            href="/"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            href="#packages"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            Packages
          </Link>
          <Link
            href="#about"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="#contact"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            Contact
          </Link>
          <Link
            href="#gallery"
            onClick={toggleMenu}
            className="hover:text-white transition-colors duration-200"
          >
            Gallery
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;
