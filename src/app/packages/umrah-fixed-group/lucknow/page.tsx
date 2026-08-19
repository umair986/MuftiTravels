import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { lucknowPackageData } from "@/app/components/Prices/lucknowPackageData";

export const metadata: Metadata = {
  title: lucknowPackageData.name,
  description: `Explore the ${lucknowPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/lucknow" },
};

export default function LucknowPackagePage() {
  return (
    <PackageDetailExperience
      pkg={lucknowPackageData}
      categoryName="Umrah Fixed Group"
    />
  );
}
