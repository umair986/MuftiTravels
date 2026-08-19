import type { Metadata } from "next";
import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { mumbaiPackageData } from "@/app/components/Prices/mumbaiPackageData";

export const metadata: Metadata = {
  title: mumbaiPackageData.name,
  description: `Explore the ${mumbaiPackageData.name} from Mufti Travels with guided support, accommodation and pilgrimage services.`,
  alternates: { canonical: "/packages/umrah-fixed-group/mumbai" },
};

export default function MumbaiPackagePage() {
  return (
    <PackageDetailExperience
      pkg={mumbaiPackageData}
      categoryName="Umrah Fixed Group"
    />
  );
}
