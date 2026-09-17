"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "./AdminLoginForm";
import AdminShell from "./AdminShell";
import ManagedPackageEditor from "./ManagedPackageEditor";

/**
 * One package's editor on its own page, reached from the pencil icon on a
 * package list (AdminPackageCollectionPage).
 */
export default function AdminPackageEditPage({
  slug,
  backHref,
  backLabel,
}: {
  slug: string;
  /** The list this package was opened from. */
  backHref: string;
  backLabel: string;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [packageName, setPackageName] = useState("");
  const [supabase] = useState(createClient);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setIsLoading(false);
    });
  }, [supabase]);

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading package...
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
    <AdminShell
      title={packageName ? `Edit ${packageName}` : "Edit package"}
      description="Details, prices, tags and visibility for this package."
      email={email}
      contentWidth="narrow"
      headerAction={
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-[#06131D]/15 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] hover:text-[#997A15]"
        >
          <FiArrowLeft /> Back to {backLabel}
        </Link>
      }
    >
      <nav
        aria-label="Breadcrumb"
        className="mb-4 font-body text-xs text-[#526168]"
      >
        <Link href={backHref} className="font-semibold hover:text-[#997A15]">
          {backLabel}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#06131D]">{packageName || slug}</span>
      </nav>
      <section className="rounded-2xl border border-[#06131D]/10 bg-white p-4 shadow-sm sm:p-8">
        <ManagedPackageEditor slug={slug} onLoaded={setPackageName} />
      </section>
    </AdminShell>
  );
}
