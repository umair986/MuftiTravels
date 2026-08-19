import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { delhiPackageData } from "@/app/components/Prices/delhiPackageData";

export default function DelhiPackagePage() {
  return <PackageDetailExperience pkg={delhiPackageData} categoryName="Umrah Fixed Group" />;
}
