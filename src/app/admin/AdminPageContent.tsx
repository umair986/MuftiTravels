"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminDashboard from "./AdminDashboard";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminPageContent() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(createClient);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setEmail(data.user?.email ?? null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#06131D] px-6">
        <p className="font-body text-sm text-[#B8C2C5]">Loading dashboard...</p>
      </main>
    );
  }

  if (email) {
    return <AdminDashboard email={email} />;
  }

  return (
    <main className="islamic-pattern flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#06131D] px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0B1E28] p-8 shadow-2xl shadow-black/20 sm:p-10">
        <div className="mb-8 text-center">
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Mufti Travels
          </p>
          <h1 className="font-display text-4xl font-semibold text-[#FAF8F5]">
            Admin Login
          </h1>
          <p className="mt-3 font-body text-sm text-[#B8C2C5]">
            Enter your details to continue.
          </p>
        </div>
        <AdminLoginForm />
      </section>
    </main>
  );
}
