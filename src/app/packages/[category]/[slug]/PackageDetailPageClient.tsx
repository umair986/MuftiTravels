"use client";

import PackageDetailExperience from "@/app/components/packages/PackageDetailExperience";
import { CategoryType, PackageData } from "@/app/components/packageData";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";
import type { SiteContentList } from "@/lib/siteContent";

type PackageDetailPageClientProps = {
  pkg: PackageData;
  categoryName: CategoryType;
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
  content: SiteContentList[];
};

/**
 * Thin client boundary for the detail experience.
 *
 * This used to re-fetch the package on mount even though the server component
 * had already loaded it — a duplicate round trip that could also swap the
 * content out from under the reader. The server fetch is now cache-tagged and
 * cleared on admin save, so it is always current.
 */
export default function PackageDetailPageClient({
  pkg,
  categoryName,
  tiers,
  tags,
  content,
}: PackageDetailPageClientProps) {
  return (
    <PackageDetailExperience
      pkg={pkg}
      categoryName={categoryName}
      tiers={tiers}
      tags={tags}
      content={content}
    />
  );
}
