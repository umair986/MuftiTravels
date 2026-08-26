import type { Metadata } from "next";
import AdminMetaLeadsPage from "./AdminMetaLeadsPage";

export const metadata: Metadata = {
  title: "Meta Ads Leads",
  description: "Import and follow up leads from Meta lead ads.",
  robots: { index: false, follow: false },
};

export default function AdminMetaLeadsRoute() {
  return <AdminMetaLeadsPage />;
}
