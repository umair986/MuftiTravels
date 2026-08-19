import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryType, packageData } from "@/app/components/packageData";
import { cmsPackageToPackageData, CmsPackageRecord } from "@/lib/packages";
import { createServerClient } from "@/lib/supabase/server";
import PackageDetailPageClient from "./PackageDetailPageClient";

const categorySlugMap: Record<string, CategoryType> = {
  "umrah-fixed-group": "Umrah Fixed Group",
  "umrah-land-package": "Umrah Land Package",
  ziyarat: "Ziyarat",
};

type PackageRouteParams = {
  category: string;
  slug: string;
};

async function getPackage({ category, slug }: PackageRouteParams) {
  const categoryName = categorySlugMap[category];
  const staticPackage = categoryName
    ? packageData[categoryName].find((item) => item.slug === slug)
    : undefined;

  if (!categoryName) return { categoryName, pkg: undefined };

  const { data } = await createServerClient()
    .from("packages")
    .select("*")
    .eq("category", categoryName)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return {
    categoryName,
    pkg: data
      ? cmsPackageToPackageData(data as CmsPackageRecord)
      : staticPackage,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PackageRouteParams>;
}): Promise<Metadata> {
  const routeParams = await params;
  const { categoryName, pkg } = await getPackage(routeParams);

  if (!categoryName || !pkg) {
    return { title: "Package Not Found" };
  }

  return {
    title: pkg.name,
    description: `${pkg.name} by Mufti Travels. Explore accommodation, transport, visa assistance and guided pilgrimage services included in this ${categoryName.toLowerCase()} package.`,
    alternates: {
      canonical: `/packages/${routeParams.category}/${routeParams.slug}`,
    },
    openGraph: {
      title: `${pkg.name} | Mufti Travels`,
      description: `Explore the ${pkg.name} pilgrimage package from Mufti Travels.`,
      type: "website",
      images: [{ url: pkg.image, alt: pkg.name }],
    },
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<PackageRouteParams>;
}) {
  const routeParams = await params;
  const { categoryName, pkg } = await getPackage(routeParams);

  if (!categoryName || !pkg) {
    notFound();
  }

  return <PackageDetailPageClient pkg={pkg} categoryName={categoryName} />;
}
