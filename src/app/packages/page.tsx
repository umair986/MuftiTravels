import type { Metadata } from "next";
import PackagesCatalogPage from "./PackagesCatalogPage";

export const metadata: Metadata = {
  title: "Hajj & Umrah Packages from India",
  description:
    "Browse Mufti Travels fixed-group, land and Ziyarat pilgrimage packages from India.",
  alternates: { canonical: "/packages" },
};

export default function PackagesPage() {
  return <PackagesCatalogPage />;
}
