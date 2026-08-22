"use client";

import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { slugifyKey } from "@/lib/taxonomy";
import { PACKAGE_CATEGORIES, schemaForCategory } from "@/lib/categoryFields";

/**
 * Creates a package as an unpublished draft.
 *
 * Only name and category are collected — everything else has a database
 * default, and the full editor opens straight afterwards. Starting unpublished
 * means a half-filled package can never appear on the live site.
 */
export default function CreatePackageDialog({
  open,
  onClose,
  onCreated,
  fixedCategory,
  existingSlugs,
  knownCategories = [],
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string, name: string) => void;
  /** Set on a single-category screen (Hajj, Ramzan) to lock the picker. */
  fixedCategory?: string;
  existingSlugs: string[];
  /** Categories already present in the database. */
  knownCategories?: string[];
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(
    fixedCategory || PACKAGE_CATEGORIES[0],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = useMemo(() => {
    const merged = new Set<string>([
      ...PACKAGE_CATEGORIES,
      ...knownCategories.filter(Boolean),
    ]);
    return [...merged].sort();
  }, [knownCategories]);

  // Reset each time the dialog opens, so a cancelled attempt leaves nothing.
  useEffect(() => {
    if (open) {
      setName("");
      setCategory(fixedCategory || PACKAGE_CATEGORIES[0]);
      setError("");
      setIsSaving(false);
    }
  }, [open, fixedCategory]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const slug = slugifyKey(name);
  const isDuplicate = Boolean(slug) && existingSlugs.includes(slug);
  const detailSchema = schemaForCategory(category);
  const canSubmit = Boolean(slug) && !isDuplicate && !isSaving;

  async function handleCreate() {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }
    if (!slug) {
      setError("That name has no letters or numbers to build a link from.");
      return;
    }
    if (isDuplicate) {
      setError(`A package already uses the link "${slug}".`);
      return;
    }

    setIsSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("packages").insert({
      slug,
      name: name.trim(),
      category,
      is_published: false,
    });

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated(slug, name.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#06131D]/60 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-package-heading"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="create-package-heading"
              className="font-display text-3xl font-semibold text-[#06131D]"
            >
              Create a package
            </h3>
            <p className="mt-1.5 font-body text-sm text-[#526168]">
              It starts as a draft, so nothing appears on the website until you
              publish it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 text-[#526168] hover:bg-stone-50"
          >
            <FiX />
          </button>
        </div>

        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
            Package name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) void handleCreate();
              }}
              placeholder="e.g. 21 Days Hajj from Mumbai"
              className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </label>

          <label className="block space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={Boolean(fixedCategory)}
              className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:bg-stone-100 disabled:text-[#526168]"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fixedCategory ? (
              <span className="block text-xs font-normal text-[#526168]">
                Fixed by this screen. Use Packages to file it elsewhere.
              </span>
            ) : (
              detailSchema && (
                <span className="block text-xs font-normal text-[#526168]">
                  {category} packages have extra fields — {schemaSummary(
                    detailSchema.fields.length,
                  )}
                </span>
              )
            )}
          </label>

          <div className="rounded-lg border border-stone-200 bg-[#FAF8F5] p-3">
            <p className="font-body text-xs font-semibold text-[#06131D]">
              Web address
            </p>
            <p className="mt-1 break-all font-body text-xs text-[#526168]">
              {slug ? (
                <>
                  /packages/
                  {category.toLowerCase().replaceAll(" ", "-")}/
                  <strong className="text-[#06131D]">{slug}</strong>
                </>
              ) : (
                "Type a name to see the link."
              )}
            </p>
            {isDuplicate && (
              <p className="mt-2 font-body text-xs font-semibold text-red-700">
                Another package already uses this link. Change the name.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiPlus /> {isSaving ? "Creating..." : "Create draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function schemaSummary(count: number): string {
  return `${count} of them, shown once the editor opens.`;
}
