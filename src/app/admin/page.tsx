import type { Metadata } from "next";
import AdminPageContent from "./AdminPageContent";

export const metadata: Metadata = {
  title: "Admin Login | Mufti Travels",
  description: "Sign in to the Mufti Travels admin area.",
};

export default function AdminLoginPage() {
  return <AdminPageContent />;
}
