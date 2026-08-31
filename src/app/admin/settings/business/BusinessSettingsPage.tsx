"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "../../AdminLoginForm";
import AdminShell from "../../AdminShell";
import BusinessProfileForm from "./BusinessProfileForm";
import ListsPanel from "./ListsPanel";

/**
 * Two unrelated-looking settings on one screen, because both are "things the
 * business owns that the finance screens read": the company identity printed
 * on invoices, and the two editable lists (expense categories, invoice line
 * presets).
 */

const TABS = [
  { value: "details", label: "Company details" },
  { value: "lists", label: "Categories & presets" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default function BusinessSettingsPage() {
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("details");

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

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading settings...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to change business details.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminShell
      title="Business details"
      description="What appears on invoices, and the lists the finance screens use."
      email={email}
      contentWidth="narrow"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((option) => {
          const isCurrent = tab === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              aria-pressed={isCurrent}
              className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                isCurrent
                  ? "bg-[#06131D] text-[#F3E5AB]"
                  : "border border-stone-200 bg-white text-[#526168] hover:border-[#D4AF37]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {tab === "details" ? <BusinessProfileForm /> : <ListsPanel />}
    </AdminShell>
  );
}
