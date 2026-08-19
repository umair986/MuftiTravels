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
      description="Create and edit Ramadan pilgrimage offers."
      category="Ramzan"
    />
  );
}
