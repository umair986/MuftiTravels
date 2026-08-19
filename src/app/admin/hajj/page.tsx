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
      description="Create and edit Hajj pilgrimage offers."
      category="Hajj"
    />
  );
}
