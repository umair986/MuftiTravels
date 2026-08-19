import type { Metadata } from "next";
import AdminPackageCollectionPage from "../AdminPackageCollectionPage";

export const metadata: Metadata = {
  title: "Tags & Tiers",
  robots: { index: false, follow: false },
};

export default function TagsPage() {
  return (
    <AdminPackageCollectionPage
      title="Tags & Tiers"
      description="Edit card labels such as Hot and Best Seller, and rename or remove package tiers."
      category=""
    />
  );
}
