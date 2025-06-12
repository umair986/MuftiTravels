"use client";

import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#092638] text-[#f8ac0d] px-6 md:px-20 py-12 mt-16">
      <div className="flex flex-col md:flex-row justify-between items-center gap-12">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Mufti Travels"
            height={60}
            width={160}
            className="h-[60px] w-auto"
            priority
          />
        </div>

        {/* Navigation */}
        <div className="flex flex-col md:flex-row gap-4 text-center">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="#about" className="hover:underline">
            About
          </Link>
          <Link href="#gallery" className="hover:underline">
            Gallery
          </Link>
          <Link href="#contact" className="hover:underline">
            Contact
          </Link>
        </div>

        {/* Contact & Social */}
        <div className="text-center md:text-right space-y-2">
          <p className="font-semibold">+91 93230 63712</p>
          <p className="text-sm">A/57 Madni Complex Bandra East Mumbai</p>
          <div className="flex justify-center md:justify-end gap-4 pt-2">
            <a
              href="https://www.instagram.com/mufti.travels/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram
                size={22}
                className="hover:text-white transition duration-300"
              />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61555597319380"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebook
                size={22}
                className="hover:text-white transition duration-300"
              />
            </a>
            <a
              href="https://wa.me/919323063712"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp
                size={22}
                className="hover:text-white transition duration-300"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Divider */}
      {/* Bottom Bar */}
      <div className="mt-10 border-t border-[#f8ac0d]/30 pt-4 text-xs text-[#f8ac0d]/70 flex justify-between items-center">
        <p>© {new Date().getFullYear()} Mufti Travels. All rights reserved.</p>
        <p>
          Powered by{" "}
          <a
            href="https://cubosquare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Cubosquare
          </a>
        </p>
      </div>
    </footer>
  );
}
