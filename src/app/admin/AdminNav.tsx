"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiArrowLeft, FiLogOut } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";

const sections = [
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/tags", label: "Tags & Tiers" },
  { href: "/admin/content", label: "Inclusions & Policies" },
  { href: "/admin/hajj", label: "Hajj" },
  { href: "/admin/ramzan", label: "Ramzan" },
];

/**
 * Shared header for the admin sections.
 *
 * Sign-out previously existed only on the dashboard, and every page offered
 * nothing but "Back to dashboard" — so moving from Packages to Tags meant two
 * navigations. This puts both in one place.
 */
export default function AdminNav() {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/admin");
  }

  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#06131D]/10 pb-4">
      <nav className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-sm font-semibold text-[#997A15] transition hover:bg-[#D4AF37]/10"
        >
          <FiArrowLeft /> Dashboard
        </Link>
        <span aria-hidden="true" className="mx-1 text-stone-300">
          |
        </span>
        {sections.map((section) => {
          const isCurrent = pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
                isCurrent
                  ? "bg-[#06131D] text-[#F3E5AB]"
                  : "text-[#526168] hover:bg-[#06131D]/5 hover:text-[#06131D]"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#06131D]/15 px-3.5 py-2 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:opacity-60"
      >
        <FiLogOut /> {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
