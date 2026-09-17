import type { Metadata } from "next";
import AdminPackageCollectionPage from "../AdminPackageCollectionPage";

export const metadata: Metadata = {
  title: "Hajj Packages",
  robots: { index: false, follow: false },
};

export default function HajjPage() {
  return (
    <AdminPackageCollectionPage
      title="Hajj Packages"
      description="Create and edit Hajj offers. These carry extra fields — Mina tent category, Maktab number, seats — that Umrah packages do not."
      basePath="/admin/hajj"
      category="Hajj"
    />
  );
}
