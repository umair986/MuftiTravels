import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { mumbaiPackageData } from "@/app/components/Prices/mumbaiPackageData";

export default function MumbaiPackagePage() {
  return <PackageDetailExperience pkg={mumbaiPackageData} categoryName="Umrah Fixed Group" />;
}
