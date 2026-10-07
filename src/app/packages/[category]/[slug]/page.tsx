import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { cmsPackageToPackageData } from "@/lib/packages";
import { CITY_LANDING } from "@/lib/cityLanding";
import {
  getPublicCatalog,
  getRetiredPackageCity,
} from "@/lib/packages.server";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbSchema, packageSchema } from "@/lib/seo";
import PackageDetailPageClient from "./PackageDetailPageClient";

type PackageRouteParams = {
  category: string;
  slug: string;
};

async function getPackage({ category, slug }: PackageRouteParams) {
  const categoryName = CATEGORY_BY_SLUG[category];
  // Every package comes from the admin; there is no hardcoded fallback.

  if (!categoryName) return { categoryName, pkg: undefined };

  const { packages, tiers, tags, content } = await getPublicCatalog();
  const record = packages.find(
    (item) => item.category === categoryName && item.slug === slug,
  );

  return {
    categoryName,
    pkg: record ? cmsPackageToPackageData(record) : undefined,
    // Kept alongside the display shape so the page can emit Product schema
    // from the real prices rather than re-deriving them.
    record,
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
  const { categoryName, pkg, record, tiers, tags, content } =
    await getPackage(routeParams);

  if (!categoryName || !pkg) {
    // A monthly package whose month is over, or one since deleted: send the
    // visitor to its city's current packages rather than a 404. This is the
    // October link forwarded on WhatsApp and opened in November. A 307, not a
    // 308 — browsers cache a permanent redirect indefinitely, and a package
    // whose month the admin extends again must be reachable again.
    const city = await getRetiredPackageCity(routeParams.slug);
    if (city) redirect(CITY_LANDING[city].path);
    notFound();
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Packages", path: "/packages" },
          {
            name: categoryName,
            path: `/packages/${routeParams.category}`,
          },
          {
            name: pkg.name,
            path: `/packages/${routeParams.category}/${routeParams.slug}`,
          },
        ])}
      />
      {record ? <JsonLd data={packageSchema(record)} /> : null}
      <PackageDetailPageClient
        pkg={pkg}
        categoryName={categoryName}
        tiers={tiers ?? []}
        tags={tags ?? []}
        content={content ?? []}
      />
    </>
  );
}
