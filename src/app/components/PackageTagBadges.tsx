"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTags,
  fetchTiers,
  resolveTags,
  tagBadgeClasses,
  type PackageTagRecord,
  type PackageTierRecord,
} from "@/lib/taxonomy";

type Taxonomy = {
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
  isLoaded: boolean;
};

const empty: Taxonomy = { tiers: [], tags: [], isLoaded: false };

/**
 * Loads the tier and tag registries once per mount. Cards render tags by key,
 * so they need the registry to know a key's label and colour.
 */
export function useTaxonomy(): Taxonomy {
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(empty);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setTaxonomy({ tiers: [], tags: [], isLoaded: true });
      return;
    }

    let isActive = true;
    void Promise.all([fetchTiers(supabase), fetchTags(supabase)]).then(
      ([tiers, tags]) => {
        if (isActive) setTaxonomy({ tiers, tags, isLoaded: true });
      },
    );
    return () => {
      isActive = false;
    };
  }, []);

  return taxonomy;
}

/**
 * Renders a package's card tags. Given keys and the registry, unknown keys are
 * dropped — deleting a tag makes it vanish from the site rather than leaking a
 * raw key onto a card.
 */
export default function PackageTagBadges({
  tagKeys,
  registry,
  className = "",
}: {
  tagKeys: string[] | undefined;
  registry: PackageTagRecord[];
  className?: string;
}) {
  const tags = resolveTags(tagKeys, registry);
  if (!tags.length) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag.key}
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${tagBadgeClasses(
            tag.color,
          )}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
