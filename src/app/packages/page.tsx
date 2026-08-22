import type { Metadata } from "next";
import { getPublicCatalog } from "@/lib/packages.server";
import PackagesCatalogPage from "./PackagesCatalogPage";

export const metadata: Metadata = {
  title: "Hajj & Umrah Packages from India",
  description:
    "Browse Mufti Travels fixed-group, land and Ziyarat pilgrimage packages from India.",
  alternates: { canonical: "/packages" },
};

export default async function PackagesPage() {
  const { packages, tiers, tags } = await getPublicCatalog();

  return <PackagesCatalogPage packages={packages} tiers={tiers} tags={tags} />;
}
