import type { Metadata } from "next";
import AdminTaxonomyPage from "./AdminTaxonomyPage";

export const metadata: Metadata = {
  title: "Tags & Tiers",
  robots: { index: false, follow: false },
};

export default function TagsPage() {
  return <AdminTaxonomyPage />;
}
