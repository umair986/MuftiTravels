import type { Metadata } from "next";
import { getPublicCatalog } from "@/lib/packages.server";
import { readCatalogFilter } from "@/lib/cityPackages";
import PackagesCatalogPage from "./PackagesCatalogPage";

export const metadata: Metadata = {
  title: "Hajj & Umrah Packages from India",
  description:
    "Browse Mufti Travels fixed-group, land and Ziyarat pilgrimage packages from India.",
  alternates: { canonical: "/packages" },
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ packages, tiers, tags }, params] = await Promise.all([
    getPublicCatalog(),
    searchParams,
  ]);

  return (
    <PackagesCatalogPage
      packages={packages}
      tiers={tiers}
      tags={tags}
      filter={readCatalogFilter(params)}
    />
  );
}
