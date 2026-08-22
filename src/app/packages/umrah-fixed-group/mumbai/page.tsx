import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { getPublicCatalog } from "@/lib/packages.server";
import { mumbaiPackageData } from "@/app/components/Prices/mumbaiPackageData";

export const metadata: Metadata = {
  title: mumbaiPackageData.name,
  description: `Explore the ${mumbaiPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/mumbai" },
};

export default async function MumbaiPackagePage() {
  // These pages are statically priced, but tier and tag names still come from
  // the registries so a rename shows up here too.
  const { tiers, tags } = await getPublicCatalog();

  return (
    <PackageDetailExperience
      pkg={mumbaiPackageData}
      categoryName="Umrah Fixed Group"
      tiers={tiers}
      tags={tags}
    />
  );
}
