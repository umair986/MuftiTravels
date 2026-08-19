import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { delhiPackageData } from "@/app/components/Prices/delhiPackageData";

export const metadata: Metadata = {
  title: delhiPackageData.name,
  description: `Explore the ${delhiPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/delhi" },
};

export default function DelhiPackagePage() {
  return (
    <PackageDetailExperience
      pkg={delhiPackageData}
      categoryName="Umrah Fixed Group"
    />
  );
}
