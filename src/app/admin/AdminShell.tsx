"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBookOpen,
  FiChevronDown,
  FiCompass,
  FiCreditCard,
  FiExternalLink,
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
 * Chrome for every signed-in admin page: a brand header across the top (logo,
 * live clock, profile menu), a persistent sidebar below it, and one content
 * column that opens with the page title.
 *
 * Replaces AdminNav, whose seven links shared a single horizontal row that
 * wrapped below ~1100px, and whose surrounding <main>/max-w wrapper each page
 * had to re-declare for itself (inconsistently — three pages used max-w-7xl,
 * two used max-w-5xl).
 *
 * Sign-out lives in the profile menu only. It used to sit in the sidebar
 * footer as well; two copies of the same control is one too many.
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

/**
 * A section stays highlighted on its sub-pages (/admin/packages/<slug> keeps
 * "Umrah Packages" lit). Overview is exact-match only, or it would be lit
 * everywhere.
 */
function isCurrentSection(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminShellProps = {
  title: string;
  description?: string;
  /** Primary action for this page, rendered beside the title (e.g. "Create new package"). */
  headerAction?: ReactNode;
  /** Form-heavy pages read better narrow. */
  contentWidth?: "default" | "narrow";
  /** Shown in the profile menu so it is clear which account is signed in. */
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

  const maxWidth = contentWidth === "narrow" ? "max-w-4xl" : "max-w-6xl";

  return (
    <div className="min-h-screen bg-[#F3EFEA]">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-[#D4AF37]/20 bg-[#06131D] shadow-lg shadow-black/10">
        <div className="flex h-full items-center gap-3 px-3 sm:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isDrawerOpen}
            className="rounded-lg p-2.5 text-[#B8C2C5] outline-none transition hover:bg-white/5 hover:text-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37] lg:hidden"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <BrandMark />

          <div className="flex-1" />

          <LiveClock />

          <span aria-hidden="true" className="hidden h-8 w-px bg-white/10 sm:block" />

          <ProfileMenu email={email} />
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {isDrawerOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-[45] bg-[#06131D]/60 lg:hidden"
        />
      )}

      {/*
        Below lg the sidebar is a full-height drawer over the header; from lg up
        it is pinned beneath the header.
      */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#06131D] transition-transform duration-200 lg:top-16 lg:z-30 lg:translate-x-0 lg:border-r lg:border-white/5 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-4 lg:hidden">
          <BrandMark />
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[#B8C2C5] transition hover:bg-white/5 hover:text-white"
          >
            <FiX />
          </button>
        </div>

        <nav
          aria-label="Admin sections"
          className="flex-1 overflow-y-auto px-3 py-5"
        >
          {SECTION_GROUPS.map((group, index) => (
            <div key={group.label ?? "overview"} className={index ? "mt-5" : ""}>
              {group.label && (
                <p className="mb-1.5 px-3 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6F8087]">
                  {group.label}
                </p>
              )}
              {group.links.map((link) => {
                const isCurrent = isCurrentSection(pathname, link.href);
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

        <div className="border-t border-white/10 px-5 py-4">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-body text-xs font-semibold text-[#8A979C] transition hover:text-[#D4AF37]"
          >
            <FiExternalLink /> View live website
          </a>
        </div>
      </aside>

      <div className="pt-16 lg:pl-64">
        <div className="border-b border-[#06131D]/10 px-4 py-5 sm:px-8 lg:px-12">
          <div
            className={`mx-auto flex flex-col gap-4 sm:flex-row sm:items-center ${maxWidth}`}
          >
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold text-[#06131D] sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 font-body text-sm text-[#526168]">
                  {description}
                </p>
              )}
            </div>

            {headerAction && (
              <div className="flex-shrink-0">{headerAction}</div>
            )}
          </div>
        </div>

        <main className="px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
          <div className={`mx-auto ${maxWidth}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * The logo artwork is gold on pure black, a shade darker than the ink header,
 * so it sits in a framed black plate (as on the public site) rather than
 * showing a faint box edge.
 */
function BrandMark() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
    >
      <span className="rounded-md border border-[#D4AF37]/30 bg-black px-1.5 py-1">
        <Image
          src="/Logo.png"
          alt="Mufti Travels"
          width={104}
          height={37}
          priority
          className="h-7 w-auto object-contain sm:h-8"
        />
      </span>
      <span className="hidden rounded-full border border-[#D4AF37]/40 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] md:inline">
        Admin
      </span>
    </Link>
  );
}

const TIME_FORMAT = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});
const DATE_FORMAT_LONG = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DATE_FORMAT_SHORT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

/**
 * Ticks every second, in the viewer's own time zone.
 *
 * The first value is set after mount, never during render: the server's clock
 * (and zone) would not match the browser's, and React would flag the mismatch.
 * Until then a same-sized placeholder holds the space so the header does not
 * shift. No aria-live — a screen reader announcing every second is noise.
 */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-w-[5.5rem] text-right leading-tight sm:min-w-[8.5rem]">
      {now ? (
        <time dateTime={now.toISOString()} className="block">
          <span className="block font-body text-sm font-semibold tabular-nums text-[#FAF8F5]">
            {TIME_FORMAT.format(now)}
          </span>
          <span className="block font-body text-[11px] text-[#D4AF37]">
            <span className="sm:hidden">{DATE_FORMAT_SHORT.format(now)}</span>
            <span className="hidden sm:inline">
              {DATE_FORMAT_LONG.format(now)}
            </span>
          </span>
        </time>
      ) : (
        <span aria-hidden="true" className="block h-[34px]" />
      )}
    </div>
  );
}

function ProfileMenu({ email }: { email?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on a click anywhere else, and on Escape (returning focus).
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/admin");
  }

  const initial = (email?.trim()[0] ?? "A").toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:pr-2"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F3E5AB] to-[#D4AF37] font-body text-sm font-bold text-[#06131D] ring-2 ring-[#D4AF37]/30">
          {initial}
        </span>
        <FiChevronDown
          className={`hidden h-4 w-4 text-[#B8C2C5] transition sm:block ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-[#06131D]/10 bg-white shadow-2xl shadow-black/20"
        >
          <div className="border-b border-stone-100 bg-[#FAF8F5] px-4 py-3">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-[#997A15]">
              Signed in as
            </p>
            <p
              title={email ?? undefined}
              className="mt-0.5 truncate font-body text-sm font-semibold text-[#06131D]"
            >
              {email ?? "Administrator"}
            </p>
          </div>
          <div className="p-1.5">
            <Link
              href="/admin/settings/business"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-body text-sm font-semibold text-[#06131D] outline-none transition hover:bg-stone-100 focus-visible:bg-stone-100"
            >
              <FiSettings className="text-[#526168]" /> Business details
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 font-body text-sm font-semibold text-red-600 outline-none transition hover:bg-red-50 focus-visible:bg-red-50 disabled:opacity-60"
            >
              <FiLogOut /> {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
