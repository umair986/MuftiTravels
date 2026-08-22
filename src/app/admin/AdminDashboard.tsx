"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AdminDashboardProps = {
  email: string;
};

export default function AdminDashboard({ email }: AdminDashboardProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [packageCount, setPackageCount] = useState<number | null>(null);
  const [enquiryCount, setEnquiryCount] = useState<number | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setIsSigningOut(false);
  }

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const client = supabase;

    async function loadCounts() {
      const [{ count: packages }, { count: enquiries }] = await Promise.all([
        client
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
        client
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ]);

      setPackageCount(packages ?? 0);
      setEnquiryCount(enquiries ?? 0);
    }

    void loadCounts();
  }, []);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-[#06131D]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#997A15]">
              Mufti Travels
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 font-body text-sm text-[#526168]">
              Welcome back, {email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetric
            label="Published Packages"
            value={packageCount === null ? "..." : String(packageCount)}
          />
          <DashboardMetric
            label="New Enquiries"
            value={enquiryCount === null ? "..." : String(enquiryCount)}
          />
          <DashboardMetric label="Testimonials" value="-" />
          <DashboardMetric label="Gallery Items" value="-" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold text-[#06131D]">
                  Content Management
                </h2>
                <p className="mt-1 font-body text-sm text-[#526168]">
                  Manage the content that appears across your website.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DashboardAction
                title="Packages"
                description="Edit offers and prices"
                href="/admin/packages"
              />
              <DashboardAction
                title="Enquiries"
                description="Review customer requests"
                href="/admin/enquiries"
              />
              <DashboardAction
                title="Testimonials"
                description="Coming soon — edited in code for now"
              />
              <DashboardAction
                title="Gallery"
                description="Coming soon — edited in code for now"
              />
              <DashboardAction
                title="Tags & Tiers"
                description="Manage card labels and package tiers"
                href="/admin/tags"
              />
              <DashboardAction
                title="Ramzan Packages"
                description="Create and edit Ramadan offers"
                href="/admin/ramzan"
              />
              <DashboardAction
                title="Hajj Packages"
                description="Create and edit Hajj offers"
                href="/admin/hajj"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#06131D] p-6 text-[#FAF8F5] shadow-sm sm:p-8">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              System Status
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              Your account is connected
            </h2>
            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5 font-body text-sm text-[#B8C2C5]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Supabase authentication is active
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm">
      <p className="font-body text-sm text-[#526168]">{label}</p>
      <p className="mt-3 font-display text-4xl font-semibold text-[#06131D]">
        {value}
      </p>
    </div>
  );
}

function DashboardAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-[#06131D]/10 bg-[#FAF8F5] p-4 transition hover:border-[#D4AF37] hover:bg-[#FFFCF3]"
      >
        <p className="font-body text-sm font-semibold text-[#06131D]">
          {title}
        </p>
        <p className="mt-1 font-body text-xs text-[#526168]">{description}</p>
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="rounded-xl border border-dashed border-[#06131D]/15 bg-[#FAF8F5]/60 p-4 opacity-60"
    >
      <p className="font-body text-sm font-semibold text-[#06131D]">{title}</p>
      <p className="mt-1 font-body text-xs text-[#526168]">{description}</p>
    </div>
  );
}
