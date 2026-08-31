"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBookOpen,
  FiCompass,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiImage,
  FiInbox,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMoon,
  FiPackage,
  FiSettings,
  FiTag,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";

/**
 * Chrome for every signed-in admin page: a persistent sidebar, a topbar that
 * carries the page title and sign-out, and one content column.
 *
 * Replaces AdminNav, whose seven links shared a single horizontal row that
 * wrapped below ~1100px, and whose surrounding <main>/max-w wrapper each page
 * had to re-declare for itself (inconsistently — three pages used max-w-7xl,
 * two used max-w-5xl).
 */

type NavLink = { href: string; label: string; icon: IconType };
type NavGroup = { label?: string; links: NavLink[] };

/**
 * Grouped rather than flat. Nine links already sat at the edge of what scans as
 * a single list, and the finance section adds four more — past the point where
 * the eye can find "Enquiries" without reading every label. The first group is
 * unlabelled because Overview belongs to no category.
 */
const SECTION_GROUPS: NavGroup[] = [
  {
    links: [{ href: "/admin", label: "Overview", icon: FiGrid }],
  },
  {
    label: "Catalogue",
    links: [
      { href: "/admin/packages", label: "Umrah Packages", icon: FiPackage },
      { href: "/admin/hajj", label: "Hajj", icon: FiCompass },
      { href: "/admin/ramzan", label: "Ramzan", icon: FiMoon },
      { href: "/admin/gallery", label: "Gallery", icon: FiImage },
      { href: "/admin/tags", label: "Tags & Tiers", icon: FiTag },
      {
        href: "/admin/content",
        label: "Inclusions & Policies",
        icon: FiBookOpen,
      },
    ],
  },
  {
    label: "Leads",
    links: [
      { href: "/admin/enquiries", label: "Enquiries", icon: FiInbox },
      { href: "/admin/meta-ads", label: "Meta Ads", icon: FiTrendingUp },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/admin/invoices", label: "Invoices", icon: FiFileText },
      { href: "/admin/expenses", label: "Expenses", icon: FiCreditCard },
      { href: "/admin/trips", label: "Departures", icon: FiMapPin },
      { href: "/admin/finance", label: "Reports", icon: FiBarChart2 },
    ],
  },
  {
    label: "Settings",
    links: [
      {
        href: "/admin/settings/business",
        label: "Business details",
        icon: FiSettings,
      },
    ],
  },
];

type AdminShellProps = {
  title: string;
  description?: string;
  /** Primary action for this page, rendered in the topbar (e.g. "Create new package"). */
  headerAction?: ReactNode;
  /** Form-heavy pages read better narrow. */
  contentWidth?: "default" | "narrow";
  /** Shown in the sidebar footer so it is clear which account is signed in. */
  email?: string | null;
  children: ReactNode;
};

export default function AdminShell({
  title,
  description,
  headerAction,
  contentWidth = "default",
  email,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Navigating from the drawer should close it, or the new page opens covered.
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  /**
   * Drawer behaviour below lg: lock the page behind it, keep Tab inside it,
   * close on Escape, and hand focus back to the button that opened it. Without
   * the trap, tabbing walks invisibly through the page underneath.
   */
  useEffect(() => {
    if (!isDrawerOpen) return;

    const sidebar = sidebarRef.current;
    // Captured now rather than read in cleanup: by the time cleanup runs the
    // ref may already point elsewhere.
    const opener = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [isDrawerOpen]);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/admin");
  }

  const maxWidth = contentWidth === "narrow" ? "max-w-4xl" : "max-w-6xl";

  return (
    <div className="min-h-screen bg-[#F3EFEA]">
      {/* Mobile drawer backdrop */}
      {isDrawerOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-[#06131D]/60 lg:hidden"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#06131D] transition-transform duration-200 lg:translate-x-0 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
              Mufti Travels
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#FAF8F5]">
              Admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[#B8C2C5] transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <FiX />
          </button>
        </div>

        <nav
          aria-label="Admin sections"
          className="flex-1 overflow-y-auto px-3 pb-4"
        >
          {SECTION_GROUPS.map((group, index) => (
            <div key={group.label ?? "overview"} className={index ? "mt-5" : ""}>
              {group.label && (
                <p className="mb-1.5 px-3 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6F8087]">
                  {group.label}
                </p>
              )}
              {group.links.map((link) => {
                const isCurrent = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                      isCurrent
                        ? "bg-[#D4AF37] text-[#06131D]"
                        : "text-[#B8C2C5] hover:bg-white/5 hover:text-[#FAF8F5]"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-5">
          {email && (
            <p
              title={email}
              className="mb-3 truncate font-body text-xs text-[#8A979C]"
            >
              {email}
            </p>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            className="inline-flex w-full items-center gap-2 rounded-lg border border-white/15 px-3.5 py-2.5 font-body text-sm font-semibold text-[#FAF8F5] outline-none transition hover:border-[#D4AF37] hover:text-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37] disabled:opacity-60"
          >
            <FiLogOut /> {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[#06131D]/10 bg-[#F3EFEA]/85 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
          <div className={`mx-auto flex items-center gap-4 ${maxWidth}`}>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={isDrawerOpen}
              className="rounded-lg border border-[#06131D]/15 p-2.5 text-[#06131D] outline-none transition hover:border-[#997A15] hover:text-[#997A15] focus-visible:ring-2 focus-visible:ring-[#997A15] lg:hidden"
            >
              <FiMenu />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-semibold text-[#06131D] sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 truncate font-body text-sm text-[#526168]">
                  {description}
                </p>
              )}
            </div>

            {headerAction && (
              <div className="flex-shrink-0">{headerAction}</div>
            )}
          </div>
        </header>

        <main className="px-5 py-8 sm:px-8 lg:px-12">
          <div className={`mx-auto ${maxWidth}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
