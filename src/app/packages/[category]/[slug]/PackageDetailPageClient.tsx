"use client";

import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { CategoryType, PackageData } from "@/app/components/packageData";
import { useEffect, useState } from "react";
import { cmsPackageToPackageData, CmsPackageRecord } from "@/lib/packages";
import { createClient } from "@/lib/supabase/client";

type PackageDetailPageClientProps = {
  pkg: PackageData;
  categoryName: CategoryType;
};

export default function PackageDetailPageClient({
  pkg,
  categoryName,
}: PackageDetailPageClientProps) {
  const [currentPackage, setCurrentPackage] = useState(pkg);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from("packages")
      .select("*")
      .eq("slug", pkg.slug)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCurrentPackage(cmsPackageToPackageData(data as CmsPackageRecord));
        }
      });
  }, [pkg.slug]);

  return (
    <PackageDetailExperience pkg={currentPackage} categoryName={categoryName} />
  );
}
