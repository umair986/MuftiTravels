import type { Metadata } from "next";
import { Suspense } from "react";
import AdminPageContent from "./AdminPageContent";

export const metadata: Metadata = {
  title: "Admin Login | Mufti Travels",
  description: "Sign in to the Mufti Travels admin area.",
};

export default function AdminLoginPage() {
  return (
    // AdminPageContent reads ?timeout=1 to explain an expired session, which
    // needs a Suspense boundary to keep this route statically prerenderable.
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#06131D] px-6">
          <p className="font-body text-sm text-[#B8C2C5]">
            Loading dashboard...
          </p>
        </main>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
