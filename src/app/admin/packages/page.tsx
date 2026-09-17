import type { Metadata } from "next";
import AdminPackageCollectionPage from "../AdminPackageCollectionPage";

export const metadata: Metadata = {
  title: "Umrah Packages",
  description: "Manage Mufti Travels Umrah packages.",
  robots: { index: false, follow: false },
};

export default function AdminPackagesRoute() {
  return (
    <AdminPackageCollectionPage
      title="Umrah Packages"
      description="Create, edit and publish Umrah packages shown on your website."
      basePath="/admin/packages"
      categories={["Umrah Fixed Group", "Umrah Land Package", "Ziyarat"]}
    />
  );
}
