"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiMenu, FiX } from "react-icons/fi";

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
            width={100}
            height={120}
            className="w-20 h-auto"
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/">Home</Link>
          <Link href="/packages">Packages</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
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
          <Link href="/" onClick={toggleMenu}>
            Home
          </Link>
          <Link href="/packages" onClick={toggleMenu}>
            Packages
          </Link>
          <Link href="/about" onClick={toggleMenu}>
            About
          </Link>
          <Link href="/contact" onClick={toggleMenu}>
            Contact
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;
