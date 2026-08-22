import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { packageData } from "@/app/components/packageData";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { cmsPackageToPackageData } from "@/lib/packages";
import { getPublicCatalog } from "@/lib/packages.server";
import PackageDetailPageClient from "./PackageDetailPageClient";

type PackageRouteParams = {
  category: string;
  slug: string;
};

async function getPackage({ category, slug }: PackageRouteParams) {
  const categoryName = CATEGORY_BY_SLUG[category];
  // Only three categories carry hardcoded fallbacks; the rest are CMS-only.
  const staticPackage =
    categoryName && categoryName in packageData
      ? packageData[categoryName as keyof typeof packageData].find(
          (item) => item.slug === slug,
        )
      : undefined;

  if (!categoryName) return { categoryName, pkg: undefined };

  const { packages, tiers, tags, content } = await getPublicCatalog();
  const record = packages.find(
    (item) => item.category === categoryName && item.slug === slug,
  );

  return {
    categoryName,
    pkg: record ? cmsPackageToPackageData(record) : staticPackage,
    tiers,
    tags,
    content,
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
  const { categoryName, pkg, tiers, tags, content } =
    await getPackage(routeParams);

  if (!categoryName || !pkg) {
    notFound();
  }

  return (
    <PackageDetailPageClient
      pkg={pkg}
      categoryName={categoryName}
      tiers={tiers ?? []}
      tags={tags ?? []}
      content={content ?? []}
    />
  );
}
