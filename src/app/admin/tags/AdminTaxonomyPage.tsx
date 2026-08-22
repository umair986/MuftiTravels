"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { CmsPackageRecord } from "@/lib/packages";
import {
  fetchTags,
  fetchTiers,
  slugifyKey,
  TAG_COLOR_KEYS,
  TAG_COLORS,
  tagSwatch,
  type PackageTagRecord,
  type PackageTierRecord,
  type TagColor,
} from "@/lib/taxonomy";
import AdminLoginForm from "../AdminLoginForm";
import AdminNav from "../AdminNav";

type UsageMap = Record<string, string[]>;

export default function AdminTaxonomyPage() {
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tiers, setTiers] = useState<PackageTierRecord[]>([]);
  const [tags, setTags] = useState<PackageTagRecord[]>([]);
  const [tierUsage, setTierUsage] = useState<UsageMap>({});
  const [tagUsage, setTagUsage] = useState<UsageMap>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email ?? null);
    if (!userData.user) {
      setIsLoading(false);
      return;
    }

    const [nextTiers, nextTags, { data: packageRows }] = await Promise.all([
      fetchTiers(supabase),
      fetchTags(supabase),
      supabase.from("packages").select("name, prices, card_tags"),
    ]);

    // Work out what is in use, so deletes can be blocked with a real reason.
    const tierMap: UsageMap = {};
    const tagMap: UsageMap = {};
    for (const row of (packageRows as Partial<CmsPackageRecord>[]) ?? []) {
      for (const key of Object.keys(row.prices ?? {})) {
        (tierMap[key] ??= []).push(row.name ?? "Untitled");
      }
      for (const key of row.card_tags ?? []) {
        (tagMap[key] ??= []).push(row.name ?? "Untitled");
      }
    }

    setTiers(nextTiers);
    setTags(nextTags);
    setTierUsage(tierMap);
    setTagUsage(tagMap);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(text: string) {
    setMessage(text);
    setError("");
  }

  /* ---------------------------------------------------------------- tiers */

  async function addTier(name: string) {
    if (!supabase) return;
    const key = slugifyKey(name);
    if (!key) return setError("Give the tier a name first.");
    if (tiers.some((tier) => tier.key === key))
      return setError(`A tier with the key "${key}" already exists.`);

    const nextOrder = Math.max(0, ...tiers.map((t) => t.sort_order)) + 10;
    const { error: insertError } = await supabase
      .from("package_tiers")
      .insert({ key, name: name.trim(), sort_order: nextOrder });
    if (insertError) return setError(insertError.message);
    flash(`Tier "${name.trim()}" added.`);
    void load();
  }

  async function renameTier(tier: PackageTierRecord, name: string) {
    if (!supabase || name.trim() === tier.name) return;
    // Only the display name changes. The key stays put, so every package's
    // prices keep pointing at the right tier.
    const { error: updateError } = await supabase
      .from("package_tiers")
      .update({ name: name.trim() })
      .eq("id", tier.id);
    if (updateError) return setError(updateError.message);
    flash(`Renamed to "${name.trim()}". Every package using it updated.`);
    void load();
  }

  async function moveTier(tier: PackageTierRecord, direction: -1 | 1) {
    if (!supabase) return;
    const ordered = [...tiers];
    const index = ordered.findIndex((item) => item.id === tier.id);
    const swapWith = ordered[index + direction];
    if (!swapWith) return;

    await Promise.all([
      supabase
        .from("package_tiers")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", tier.id),
      supabase
        .from("package_tiers")
        .update({ sort_order: tier.sort_order })
        .eq("id", swapWith.id),
    ]);
    void load();
  }

  async function deleteTier(tier: PackageTierRecord) {
    if (!supabase) return;
    const inUse = tierUsage[tier.key] ?? [];
    if (inUse.length) {
      return setError(
        `"${tier.name}" is priced on ${inUse.length} package${inUse.length > 1 ? "s" : ""}: ${inUse.join(", ")}. Remove those prices first.`,
      );
    }
    const { error: deleteError } = await supabase
      .from("package_tiers")
      .delete()
      .eq("id", tier.id);
    if (deleteError) return setError(deleteError.message);
    flash(`Tier "${tier.name}" deleted.`);
    void load();
  }

  /* ----------------------------------------------------------------- tags */

  async function addTag(label: string, color: TagColor) {
    if (!supabase) return;
    const key = slugifyKey(label);
    if (!key) return setError("Give the tag a label first.");
    if (tags.some((tag) => tag.key === key))
      return setError(`A tag with the key "${key}" already exists.`);

    const nextOrder = Math.max(0, ...tags.map((t) => t.sort_order)) + 10;
    const { error: insertError } = await supabase
      .from("package_tags")
      .insert({ key, label: label.trim(), color, sort_order: nextOrder });
    if (insertError) return setError(insertError.message);
    flash(`Tag "${label.trim()}" added.`);
    void load();
  }

  async function updateTag(
    tag: PackageTagRecord,
    changes: { label?: string; color?: TagColor },
  ) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("package_tags")
      .update({
        ...(changes.label !== undefined ? { label: changes.label.trim() } : {}),
        ...(changes.color !== undefined ? { color: changes.color } : {}),
      })
      .eq("id", tag.id);
    if (updateError) return setError(updateError.message);
    flash("Tag updated everywhere it appears.");
    void load();
  }

  async function moveTag(tag: PackageTagRecord, direction: -1 | 1) {
    if (!supabase) return;
    const index = tags.findIndex((item) => item.id === tag.id);
    const swapWith = tags[index + direction];
    if (!swapWith) return;

    await Promise.all([
      supabase
        .from("package_tags")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", tag.id),
      supabase
        .from("package_tags")
        .update({ sort_order: tag.sort_order })
        .eq("id", swapWith.id),
    ]);
    void load();
  }

  async function deleteTag(tag: PackageTagRecord) {
    if (!supabase) return;
    const inUse = tagUsage[tag.key] ?? [];
    if (inUse.length) {
      return setError(
        `"${tag.label}" is on ${inUse.length} package${inUse.length > 1 ? "s" : ""}: ${inUse.join(", ")}. Untick it there first.`,
      );
    }
    const { error: deleteError } = await supabase
      .from("package_tags")
      .delete()
      .eq("id", tag.id);
    if (deleteError) return setError(deleteError.message);
    flash(`Tag "${tag.label}" deleted.`);
    void load();
  }

  /* --------------------------------------------------------------- render */

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading tags and tiers...
      </main>
    );

  if (!email)
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F3EFEA] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        <header className="border-b border-[#06131D]/10 pb-7">
          <h1 className="font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
            Tags &amp; Tiers
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-[#526168]">
            Anything you create here becomes selectable when you edit a package.
            Renaming is safe — packages point at a fixed key, so a rename
            updates every package at once without touching their prices.
          </p>
        </header>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">
            {error}
          </p>
        )}
        {message && !error && (
          <p className="mt-6 rounded-lg bg-emerald-50 p-3 font-body text-sm text-emerald-700">
            {message}
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <TierPanel
            tiers={tiers}
            usage={tierUsage}
            onAdd={addTier}
            onRename={renameTier}
            onMove={moveTier}
            onDelete={deleteTier}
          />
          <TagPanel
            tags={tags}
            usage={tagUsage}
            onAdd={addTag}
            onUpdate={updateTag}
            onMove={moveTag}
            onDelete={deleteTag}
          />
        </div>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* Tiers                                                                      */
/* ========================================================================== */

function TierPanel({
  tiers,
  usage,
  onAdd,
  onRename,
  onMove,
  onDelete,
}: {
  tiers: PackageTierRecord[];
  usage: UsageMap;
  onAdd: (name: string) => void;
  onRename: (tier: PackageTierRecord, name: string) => void;
  onMove: (tier: PackageTierRecord, direction: -1 | 1) => void;
  onDelete: (tier: PackageTierRecord) => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <section className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-3xl font-semibold text-[#06131D]">
        Package tiers
      </h2>
      <p className="mt-1 font-body text-sm text-[#526168]">
        The price bands offered on a package — the dropdown you see on each
        price row. Order here is the order they appear.
      </p>

      <div className="mt-5 flex gap-2">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd(newName);
              setNewName("");
            }
          }}
          placeholder="New tier name, e.g. Budget"
          className="h-11 flex-1 rounded-lg border border-stone-200 px-3.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(newName);
            setNewName("");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-4 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A]"
        >
          <FiPlus /> Add
        </button>
      </div>

      <div className="mt-5 space-y-2.5">
        {tiers.map((tier, index) => (
          <TierRow
            key={tier.id}
            tier={tier}
            usageCount={(usage[tier.key] ?? []).length}
            isFirst={index === 0}
            isLast={index === tiers.length - 1}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
        {!tiers.length && (
          <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center font-body text-sm text-[#526168]">
            No tiers yet. Add one above.
          </p>
        )}
      </div>
    </section>
  );
}

function TierRow({
  tier,
  usageCount,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
}: {
  tier: PackageTierRecord;
  usageCount: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (tier: PackageTierRecord, name: string) => void;
  onMove: (tier: PackageTierRecord, direction: -1 | 1) => void;
  onDelete: (tier: PackageTierRecord) => void;
}) {
  const [name, setName] = useState(tier.name);
  useEffect(() => setName(tier.name), [tier.name]);
  const isDirty = name.trim() !== tier.name;

  return (
    <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(tier, -1)}
            disabled={isFirst}
            aria-label={`Move ${tier.name} up`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronUp />
          </button>
          <button
            type="button"
            onClick={() => onMove(tier, 1)}
            disabled={isLast}
            aria-label={`Move ${tier.name} down`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronDown />
          </button>
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-stone-200 bg-white px-3 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />

        {isDirty && (
          <button
            type="button"
            onClick={() => onRename(tier, name)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 font-body text-xs font-bold text-[#06131D]"
          >
            <FiSave /> Save
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(tier)}
          aria-label={`Delete ${tier.name}`}
          className="inline-flex h-10 items-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50"
        >
          <FiTrash2 />
        </button>
      </div>

      <p className="mt-2 pl-8 font-body text-xs text-[#526168]">
        <code className="rounded bg-stone-200/70 px-1.5 py-0.5">{tier.key}</code>{" "}
        {usageCount
          ? `· priced on ${usageCount} package${usageCount > 1 ? "s" : ""}`
          : "· not used yet"}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Tags                                                                       */
/* ========================================================================== */

function TagPanel({
  tags,
  usage,
  onAdd,
  onUpdate,
  onMove,
  onDelete,
}: {
  tags: PackageTagRecord[];
  usage: UsageMap;
  onAdd: (label: string, color: TagColor) => void;
  onUpdate: (
    tag: PackageTagRecord,
    changes: { label?: string; color?: TagColor },
  ) => void;
  onMove: (tag: PackageTagRecord, direction: -1 | 1) => void;
  onDelete: (tag: PackageTagRecord) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("gold");

  return (
    <section className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-3xl font-semibold text-[#06131D]">
        Card tags
      </h2>
      <p className="mt-1 font-body text-sm text-[#526168]">
        The badges shown on package cards across the site. Pick a colour for
        each; tick which ones apply when you edit a package.
      </p>

      <div className="mt-5 space-y-3 rounded-xl border border-stone-200 bg-[#FAF8F5] p-3">
        <input
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          placeholder="New tag label, e.g. Best Selling"
          className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        <div className="flex items-center justify-between gap-3">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button
            type="button"
            onClick={() => {
              onAdd(newLabel, newColor);
              setNewLabel("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A]"
          >
            <FiPlus /> Add
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {tags.map((tag, index) => (
          <TagRow
            key={tag.id}
            tag={tag}
            usageCount={(usage[tag.key] ?? []).length}
            isFirst={index === 0}
            isLast={index === tags.length - 1}
            onUpdate={onUpdate}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
        {!tags.length && (
          <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center font-body text-sm text-[#526168]">
            No tags yet. Add one above.
          </p>
        )}
      </div>
    </section>
  );
}

function TagRow({
  tag,
  usageCount,
  isFirst,
  isLast,
  onUpdate,
  onMove,
  onDelete,
}: {
  tag: PackageTagRecord;
  usageCount: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (
    tag: PackageTagRecord,
    changes: { label?: string; color?: TagColor },
  ) => void;
  onMove: (tag: PackageTagRecord, direction: -1 | 1) => void;
  onDelete: (tag: PackageTagRecord) => void;
}) {
  const [label, setLabel] = useState(tag.label);
  useEffect(() => setLabel(tag.label), [tag.label]);
  const isDirty = label.trim() !== tag.label;

  return (
    <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(tag, -1)}
            disabled={isFirst}
            aria-label={`Move ${tag.label} up`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronUp />
          </button>
          <button
            type="button"
            onClick={() => onMove(tag, 1)}
            disabled={isLast}
            aria-label={`Move ${tag.label} down`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronDown />
          </button>
        </div>

        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-stone-200 bg-white px-3 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />

        {isDirty && (
          <button
            type="button"
            onClick={() => onUpdate(tag, { label })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 font-body text-xs font-bold text-[#06131D]"
          >
            <FiSave /> Save
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(tag)}
          aria-label={`Delete ${tag.label}`}
          className="inline-flex h-10 items-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50"
        >
          <FiTrash2 />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-8">
        <ColorPicker
          value={tag.color}
          onChange={(color) => onUpdate(tag, { color })}
        />
        <p className="font-body text-xs text-[#526168]">
          {usageCount
            ? `on ${usageCount} package${usageCount > 1 ? "s" : ""}`
            : "not used yet"}
        </p>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: TagColor;
  onChange: (color: TagColor) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TAG_COLOR_KEYS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={TAG_COLORS[color].label}
          aria-pressed={value === color}
          title={TAG_COLORS[color].label}
          style={{ backgroundColor: tagSwatch(color) }}
          className={`h-6 w-6 rounded-full transition ${
            value === color
              ? "ring-2 ring-[#06131D] ring-offset-2"
              : "opacity-70 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}
