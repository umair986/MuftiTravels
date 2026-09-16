"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiInbox } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "./AdminShell";

type AdminDashboardProps = {
  email: string;
};

type RecentEnquiry = {
  id: string;
  name: string;
  phone: string;
  package_name: string;
  created_at: string;
};

function formatWhen(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/**
 * The admin landing page.
 *
 * It used to repeat the navigation as eight link cards; with the sidebar in
 * AdminShell those were the same links twice, so the space now goes to the one
 * question this page should answer — what needs attention today.
 */
export default function AdminDashboard({ email }: AdminDashboardProps) {
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [enquiryCount, setEnquiryCount] = useState<number | null>(null);
  const [galleryCount, setGalleryCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentEnquiry[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const client = supabase;

    async function load() {
      const [
        { count: published },
        { count: drafts },
        { count: enquiries },
        { count: gallery },
        { data: newest },
      ] = await Promise.all([
        client
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
        client
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("is_published", false),
        client
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .is("deleted_at", null),
        client
          .from("gallery_photos")
          .select("id", { count: "exact", head: true }),
        client
          .from("enquiries")
          .select("id, name, phone, package_name, created_at")
          .eq("status", "new")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setPublishedCount(published ?? 0);
      setDraftCount(drafts ?? 0);
      setEnquiryCount(enquiries ?? 0);
      setGalleryCount(gallery ?? 0);
      setRecent((newest as RecentEnquiry[]) ?? []);
    }

    void load();
  }, []);

  return (
    <AdminShell
      title="Overview"
      description="What needs attention across the site."
      email={email}
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="New Enquiries"
          value={enquiryCount}
          href="/admin/enquiries"
          emphasis={Boolean(enquiryCount)}
        />
        <MetricCard
          label="Published Packages"
          value={publishedCount}
          href="/admin/packages"
        />
        <MetricCard
          label="Draft Packages"
          value={draftCount}
          href="/admin/packages"
        />
        <MetricCard
          label="Gallery Photos"
          value={galleryCount}
          href="/admin/gallery"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-[#06131D]">
              Needs attention
            </h2>
            <Link
              href="/admin/enquiries"
              className="inline-flex items-center gap-1 font-body text-sm font-semibold text-[#997A15] transition hover:text-[#06131D]"
            >
              All enquiries <FiArrowUpRight />
            </Link>
          </div>

          {recent === null && (
            <p className="mt-6 font-body text-sm text-[#526168]">Loading...</p>
          )}

          {recent?.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-stone-300 p-10 text-center">
              <FiInbox className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-3 font-body text-sm text-[#526168]">
                No new enquiries. Everything has been picked up.
              </p>
            </div>
          )}

          {recent?.length ? (
            <ul className="mt-5 divide-y divide-stone-100">
              {recent.map((enquiry) => (
                <li key={enquiry.id}>
                  <Link
                    href="/admin/enquiries"
                    className="flex items-center justify-between gap-4 py-3.5 transition hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-semibold text-[#06131D]">
                        {enquiry.name || "Unnamed enquiry"}
                      </p>
                      <p className="mt-0.5 truncate font-body text-xs text-[#526168]">
                        {[enquiry.phone, enquiry.package_name]
                          .filter(Boolean)
                          .join(" · ") || "No details given"}
                      </p>
                    </div>
                    <span className="flex-shrink-0 font-body text-xs text-[#526168]">
                      {formatWhen(enquiry.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
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
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  href,
  emphasis = false,
}: {
  label: string;
  value: number | null;
  href: string;
  /** Draws the eye to a count that means work is waiting. */
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        emphasis
          ? "border-[#D4AF37] bg-[#FFFCF3]"
          : "border-[#06131D]/10 bg-white hover:border-[#D4AF37]/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-body text-sm text-[#526168]">{label}</p>
        <FiArrowUpRight className="h-4 w-4 flex-shrink-0 text-stone-300 transition group-hover:text-[#997A15]" />
      </div>
      <p className="mt-3 font-display text-4xl font-semibold text-[#06131D]">
        {value === null ? "..." : value}
      </p>
    </Link>
  );
}
