"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { CategoryType, packageData } from "@/app/components/packageData";

const categorySlugMap: Record<string, CategoryType> = {
  "umrah-fixed-group": "Umrah Fixed Group",
  "umrah-land-package": "Umrah Land Package",
  ziyarat: "Ziyarat",
};

export default function PackageDetailPage() {
  const params = useParams<{ category: string; slug: string }>();
  const router = useRouter();
  const categorySlug = Array.isArray(params.category) ? params.category[0] : params.category;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const categoryName = categorySlugMap[categorySlug];
  const pkg = useMemo(() => categoryName ? packageData[categoryName].find((item) => item.slug === slug) : undefined, [categoryName, slug]);

  useEffect(() => { if (!categoryName || !pkg) router.replace("/"); }, [categoryName, pkg, router]);

  if (!categoryName || !pkg) {
    return <main className="grid min-h-screen place-items-center bg-[#FAF8F5] p-6 text-center"><div><p className="font-display text-3xl font-bold text-[#06131D]">Loading your journey</p><p className="mt-2 text-sm text-stone-600">Finding the requested package details.</p></div></main>;
  }

  return <PackageDetailExperience pkg={pkg} categoryName={categoryName} />;
}
