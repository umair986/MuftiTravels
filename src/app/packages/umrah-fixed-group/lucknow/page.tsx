import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { lucknowPackageData } from "@/app/components/Prices/lucknowPackageData";

export default function LucknowPackagePage() {
  return <PackageDetailExperience pkg={lucknowPackageData} categoryName="Umrah Fixed Group" />;
}
