import type { Metadata } from "next";
import AdminPackagesPage from "./AdminPackagesPage";

export const metadata: Metadata = {
  title: "Manage Packages",
  description: "Manage Mufti Travels pilgrimage packages.",
  robots: { index: false, follow: false },
};

export default function AdminPackagesRoute() {
  return <AdminPackagesPage />;
}
