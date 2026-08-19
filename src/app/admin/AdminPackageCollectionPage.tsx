"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiEdit3, FiPlus } from "react-icons/fi";
import { CmsPackageRecord } from "@/lib/packages";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "./AdminLoginForm";
import ManagedPackageEditor from "./ManagedPackageEditor";

export default function AdminPackageCollectionPage({
  title,
  description,
  category,
}: {
  title: string;
  description: string;
  category?: string;
}) {
  const [records, setRecords] = useState<CmsPackageRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supabase] = useState(createClient);

  const load = useCallback(async () => {
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
    let query = supabase.from("packages").select("*");
    if (category) query = query.eq("category", category);
    const { data, error: queryError } = await query.order("sort_order", {
      ascending: true,
    });
    if (queryError) setError(queryError.message);
    setRecords((data as CmsPackageRecord[]) ?? []);
    setIsLoading(false);
  }, [category, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading {title.toLowerCase()}...
      </main>
    );
  if (!email)
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-[#06131D]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 font-body text-sm font-semibold text-[#997A15]"
            >
              <FiArrowLeft /> Back to dashboard
            </Link>
            <h1 className="mt-4 font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-2 font-body text-sm text-[#526168]">
              {description}
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-3 font-body text-sm font-bold text-[#F3E5AB] opacity-60"
          >
            <FiPlus /> Create new package
          </button>
        </header>
        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <section className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-3xl font-semibold text-[#06131D]">
              Package list
            </h2>
            <div className="mt-5 space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${selectedSlug === record.slug ? "border-[#D4AF37] bg-[#FFFCF3]" : "border-stone-200 bg-[#FAF8F5]"}`}
                >
                  <div>
                    <p className="font-body text-sm font-semibold text-[#06131D]">
                      {record.name}
                    </p>
                    <p className="mt-1 text-xs text-[#526168]">
                      {record.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(record.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#06131D]/15 px-3 py-2 text-xs font-bold"
                  >
                    <FiEdit3 /> Edit
                  </button>
                </div>
              ))}
              {!records.length && (
                <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-[#526168]">
                  No {(category ?? "").toLowerCase()} packages yet. Use Create
                  new package when the create form is enabled.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
            {selectedSlug ? (
              <ManagedPackageEditor slug={selectedSlug} />
            ) : (
              <div className="grid min-h-64 place-items-center text-center text-sm text-[#526168]">
                Select a package to edit its details, tags and tiers.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
