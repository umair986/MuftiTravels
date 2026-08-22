import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { getPublicCatalog } from "@/lib/packages.server";
import { lucknowPackageData } from "@/app/components/Prices/lucknowPackageData";

export const metadata: Metadata = {
  title: lucknowPackageData.name,
  description: `Explore the ${lucknowPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/lucknow" },
};

export default async function LucknowPackagePage() {
  // These pages are statically priced, but tier and tag names — and the shared
  // inclusions, policies and notes — still come from the database, so an edit
  // in the dashboard shows up here too.
  const { tiers, tags, content } = await getPublicCatalog();

  return (
    <PackageDetailExperience
      pkg={lucknowPackageData}
      categoryName="Umrah Fixed Group"
      tiers={tiers}
      tags={tags}
      content={content}
    />
  );
}
