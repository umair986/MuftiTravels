import {
  resolveTags,
  tagBadgeClasses,
  type PackageTagRecord,
} from "@/lib/taxonomy";

/**
 * Renders a package's card tags.
 *
 * The registry is passed in rather than fetched, so this works in server and
 * client components alike. Keys with no matching registry row are dropped —
 * deleting a tag makes it vanish from the site rather than leaking a raw key
 * such as `best-seller` onto a card.
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
