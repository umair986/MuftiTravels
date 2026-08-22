import type { Metadata } from "next";
import AdminPackageCollectionPage from "../AdminPackageCollectionPage";

export const metadata: Metadata = {
  title: "Manage Packages",
  description: "Manage Mufti Travels pilgrimage packages.",
  robots: { index: false, follow: false },
};

export default function AdminPackagesRoute() {
  return (
    <AdminPackageCollectionPage
      title="Packages"
      description="Create, edit and publish the packages shown on your website."
    />
  );
}
