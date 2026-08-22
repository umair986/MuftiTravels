import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { getPublicCatalog } from "@/lib/packages.server";
import { delhiPackageData } from "@/app/components/Prices/delhiPackageData";

export const metadata: Metadata = {
  title: delhiPackageData.name,
  description: `Explore the ${delhiPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/delhi" },
};

export default async function DelhiPackagePage() {
  // These pages are statically priced, but tier and tag names still come from
  // the registries so a rename shows up here too.
  const { tiers, tags } = await getPublicCatalog();

  return (
    <PackageDetailExperience
      pkg={delhiPackageData}
      categoryName="Umrah Fixed Group"
      tiers={tiers}
      tags={tags}
    />
  );
}
