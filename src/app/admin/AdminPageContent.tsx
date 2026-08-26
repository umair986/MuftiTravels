"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminDashboard from "./AdminDashboard";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminPageContent() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(createClient);
  const searchParams = useSearchParams();
  const timedOut = searchParams.get("timeout") === "1";

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    async function resolve(
      userId: string | undefined,
      userEmail: string | null,
    ) {
      if (!isMounted) return;
      setEmail(userEmail);
      if (userId) {
        const { data: adminRow } = await supabase!
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (isMounted) setIsAdmin(Boolean(adminRow));
      } else {
        setIsAdmin(false);
      }
      if (isMounted) setIsLoading(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      void resolve(data.user?.id, data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session?.user.id, session?.user.email ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06131D] px-6">
        <p className="font-body text-sm text-[#B8C2C5]">Loading dashboard...</p>
      </main>
    );
  }

  if (email && isAdmin) {
    return <AdminDashboard email={email} />;
  }

  // Signed in, but not on the admin list. Say so plainly rather than showing a
  // dashboard whose every query will fail.
  if (email && !isAdmin) {
    return (
      <main className="islamic-pattern flex min-h-screen items-center justify-center bg-[#06131D] px-6 py-16">
        <section className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0B1E28] p-8 text-center shadow-2xl sm:p-10">
          <h1 className="font-display text-4xl font-semibold text-[#FAF8F5]">
            No admin access
          </h1>
          <p className="mt-3 font-body text-sm text-[#B8C2C5]">
            You are signed in as {email}, but this account is not an
            administrator. Ask an existing admin to add you.
          </p>
          <button
            type="button"
            onClick={async () => {
              const client = createClient();
              if (client) await client.auth.signOut();
            }}
            className="mt-7 rounded-lg bg-[#D4AF37] px-5 py-3 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB]"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="islamic-pattern flex min-h-screen items-center justify-center bg-[#06131D] px-6 py-16">
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
        {timedOut && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-3 text-center font-body text-sm text-[#F3E5AB]"
          >
            Your session expired after 15 minutes. Please sign in again.
          </p>
        )}
        <AdminLoginForm />
      </section>
    </main>
  );
}
