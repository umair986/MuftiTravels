import type { Metadata } from "next";
import AdminEnquiriesPage from "./AdminEnquiriesPage";

export const metadata: Metadata = {
  title: "Manage Enquiries",
  description: "Review Mufti Travels customer enquiries.",
  robots: { index: false, follow: false },
};

export default function AdminEnquiriesRoute() {
  return <AdminEnquiriesPage />;
}
