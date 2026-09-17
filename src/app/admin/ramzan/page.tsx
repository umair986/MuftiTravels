import type { Metadata } from "next";
import AdminPackageCollectionPage from "../AdminPackageCollectionPage";

export const metadata: Metadata = {
  title: "Ramzan Packages",
  robots: { index: false, follow: false },
};

export default function RamzanPage() {
  return (
    <AdminPackageCollectionPage
      title="Ramzan Packages"
      description="Create and edit Ramadan offers. These carry extra fields — which part of the month, Laylatul Qadr nights, Itikaf — that Umrah packages do not."
      basePath="/admin/ramzan"
      category="Ramzan"
    />
  );
}
