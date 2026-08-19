"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiMail, FiPhone } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  departure_city: string;
  package_preference: string;
  package_name: string;
  adults: number;
  children: number;
  preferred_date: string | null;
  notes: string;
  status: "new" | "contacted" | "closed";
  created_at: string;
};

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supabase] = useState(createClient);

  const loadEnquiries = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email ?? null);
    if (!userData.user) {
      setIsLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(
        "Run 004_create_enquiries.sql in Supabase before viewing enquiries.",
      );
    } else {
      setEnquiries((data as Enquiry[]) ?? []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadEnquiries();
  }, [loadEnquiries]);

  async function updateStatus(id: string, status: Enquiry["status"]) {
    if (!supabase) return;
    await supabase.from("enquiries").update({ status }).eq("id", id);
    setEnquiries((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  if (isLoading) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading enquiries...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Please sign in at /admin first.
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-[#06131D]/10 pb-7">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 font-body text-sm font-semibold text-[#997A15] hover:text-[#06131D]"
          >
            <FiArrowLeft /> Back to dashboard
          </Link>
          <h1 className="mt-4 font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
            Enquiries
          </h1>
          <p className="mt-2 font-body text-sm text-[#526168]">
            Every enquiry submitted through the website appears here.
          </p>
        </header>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-8 space-y-4">
          {enquiries.map((enquiry) => (
            <article
              key={enquiry.id}
              className="rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl font-semibold text-[#06131D]">
                      {enquiry.name}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${enquiry.status === "new" ? "bg-amber-100 text-amber-800" : enquiry.status === "contacted" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}
                    >
                      {enquiry.status}
                    </span>
                  </div>
                  <p className="mt-1 font-body text-xs text-[#526168]">
                    {new Date(enquiry.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <select
                  value={enquiry.status}
                  onChange={(event) =>
                    updateStatus(
                      enquiry.id,
                      event.target.value as Enquiry["status"],
                    )
                  }
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D]"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="mt-5 grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                <EnquiryItem
                  label="Phone"
                  value={enquiry.phone}
                  href={`tel:${enquiry.phone}`}
                  icon={<FiPhone />}
                />
                <EnquiryItem
                  label="Email"
                  value={enquiry.email}
                  href={`mailto:${enquiry.email}`}
                  icon={<FiMail />}
                />
                <EnquiryItem
                  label="Package"
                  value={
                    enquiry.package_name ||
                    enquiry.package_preference ||
                    "General enquiry"
                  }
                />
                <EnquiryItem
                  label="Journey"
                  value={`${enquiry.departure_city || "Not specified"} · ${enquiry.adults} adults, ${enquiry.children} children`}
                />
              </div>
              {(enquiry.preferred_date || enquiry.notes) && (
                <div className="mt-4 rounded-lg bg-[#FAF8F5] p-4 font-body text-sm text-[#526168]">
                  {enquiry.preferred_date && (
                    <p>
                      <strong>Preferred date:</strong> {enquiry.preferred_date}
                    </p>
                  )}
                  {enquiry.notes && (
                    <p className="mt-1">
                      <strong>Notes:</strong> {enquiry.notes}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
          {!enquiries.length && (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center font-body text-sm text-[#526168]">
              No enquiries yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EnquiryItem({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 break-words text-sm text-[#06131D]">
        {icon}
        {value}
      </p>
    </>
  );
  return href ? (
    <a href={href} className="block hover:text-[#997A15]">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}
