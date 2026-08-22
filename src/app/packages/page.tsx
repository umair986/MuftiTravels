import type { Metadata } from "next";
import { getPublicCatalog } from "@/lib/packages.server";
import PackagesCatalogPage from "./PackagesCatalogPage";

export const metadata: Metadata = {
  title: "Hajj & Umrah Packages from India",
  description:
    "Browse Mufti Travels fixed-group, land and Ziyarat pilgrimage packages from India.",
  alternates: { canonical: "/packages" },
};

/** Values the hero search sends through, kept to what the catalog understands. */
function readFilter(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 60) ?? "";
  };
  return { city: one("city"), category: one("category"), season: one("season") };
}

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
      filter={readFilter(params)}
    />
  );
}
