"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiEdit3, FiPlus, FiTrash2 } from "react-icons/fi";
import { CmsPackageRecord } from "@/lib/packages";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "../AdminLoginForm";
import ManagedPackageEditor from "../ManagedPackageEditor";

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<CmsPackageRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supabase] = useState(createClient);

  const loadPage = useCallback(async () => {
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
      .from("packages")
      .select("*")
      .order("sort_order", { ascending: true });

    setPackages((data as CmsPackageRecord[]) ?? []);
    if (loadError) {
      setError(
        "Create the packages table in Supabase before managing packages.",
      );
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete ${name}?`)) return;
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("packages")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSelectedSlug(null);
    await loadPage();
  }

  if (isLoading) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading packages...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="islamic-pattern flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#06131D] px-6 py-16">
        <section className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0B1E28] p-8 shadow-2xl sm:p-10">
          <h1 className="font-display text-4xl font-semibold text-[#FAF8F5]">
            Admin Login
          </h1>
          <p className="mt-3 font-body text-sm text-[#B8C2C5]">
            Sign in to manage packages.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-[#06131D]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 font-body text-sm font-semibold text-[#997A15] hover:text-[#06131D]"
            >
              <FiArrowLeft /> Back to dashboard
            </Link>
            <h1 className="mt-4 font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
              Packages
            </h1>
            <p className="mt-2 font-body text-sm text-[#526168]">
              Create, edit and publish the packages shown on your website.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="The create form will be enabled after the pilot edit flow is tested"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#06131D] px-4 py-3 font-body text-sm font-bold text-[#F3E5AB] opacity-60"
          >
            <FiPlus /> Create new package
          </button>
        </header>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">
            {error}
          </p>
        )}

        <section
          className="admin-package-layout mt-8 grid gap-8"
          data-expanded={Boolean(selectedSlug)}
        >
          <div
            className={`rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm transition-shadow duration-500 sm:p-6 ${selectedSlug ? "lg:opacity-95" : ""}`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-3xl font-semibold text-[#06131D]">
                Package list
              </h2>
              <span className="rounded-full bg-[#F3E5AB]/50 px-3 py-1 font-body text-xs font-semibold text-[#715B11]">
                {packages.length} package{packages.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3">
              {packages.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${selectedSlug === item.slug ? "border-[#D4AF37] bg-[#FFFCF3]" : "border-stone-200 bg-[#FAF8F5]"}`}
                >
                  <div>
                    <p className="font-body text-sm font-semibold text-[#06131D]">
                      {item.name}
                    </p>
                    <p className="mt-1 font-body text-xs text-[#526168]">
                      {item.category} ·{" "}
                      {item.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSlug(item.slug)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#06131D]/15 px-3 py-2 font-body text-xs font-bold text-[#06131D] hover:border-[#997A15] hover:text-[#997A15]"
                    >
                      <FiEdit3 /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      aria-label={`Delete ${item.name}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
              {packages.length === 0 && (
                <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center font-body text-sm text-[#526168]">
                  No packages found.
                </p>
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm transition-shadow duration-500 sm:p-6 ${selectedSlug ? "lg:shadow-lg" : ""}`}
          >
            {selectedSlug ? (
              <ManagedPackageEditor slug={selectedSlug} />
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <p className="font-display text-3xl font-semibold text-[#06131D]">
                    Select a package
                  </p>
                  <p className="mt-2 font-body text-sm text-[#526168]">
                    Choose Edit from the package list to update its content.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
