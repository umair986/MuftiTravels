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
import { revalidatePackages } from "@/lib/revalidate";
import {
  CONTENT_SECTION_KEYS,
  CONTENT_SECTIONS,
  CONTENT_TONE_KEYS,
  CONTENT_TONES,
  DEFAULT_CONTENT_LISTS,
  fetchContentLists,
  listsInSection,
  slugifyContentKey,
  type ContentSection,
  type ContentTone,
  type SiteContentList,
} from "@/lib/siteContent";
import AdminLoginForm from "../AdminLoginForm";
import AdminNav from "../AdminNav";

/**
 * Editor for the text every package page shares.
 *
 * There is deliberately no per-package override here. Inclusions and policies
 * are the same on every package today, and keeping one copy is what makes a
 * correction a single edit rather than a sweep through the catalog.
 */
export default function AdminContentPage() {
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lists, setLists] = useState<SiteContentList[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

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

    setLists(await fetchContentLists(supabase));
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Every save clears the public cache, so the site is current immediately. */
  async function afterWrite(text: string) {
    await revalidatePackages();
    setMessage(text);
    setError("");
    void load();
  }

  async function saveList(
    list: SiteContentList,
    changes: { title: string; tone: ContentTone; items: string[] },
  ) {
    if (!supabase) return;
    if (!changes.title.trim()) return setError("A list needs a heading.");

    const { error: updateError } = await supabase
      .from("site_content_lists")
      .update({
        title: changes.title.trim(),
        tone: changes.tone,
        items: changes.items,
      })
      .eq("id", list.id);
    if (updateError) return setError(updateError.message);
    await afterWrite(`"${changes.title.trim()}" updated on every package page.`);
  }

  async function addList(section: ContentSection, title: string) {
    if (!supabase) return;
    const key = slugifyContentKey(title);
    if (!key) return setError("Give the list a heading first.");
    if (lists.some((list) => list.key === key))
      return setError(`A list with the key "${key}" already exists.`);

    const siblings = listsInSection(lists, section);
    const nextOrder = Math.max(0, ...siblings.map((l) => l.sort_order)) + 10;
    const { error: insertError } = await supabase
      .from("site_content_lists")
      .insert({
        section,
        key,
        title: title.trim(),
        tone: "gold",
        items: [],
        sort_order: nextOrder,
      });
    if (insertError) return setError(insertError.message);
    await afterWrite(`"${title.trim()}" added. Add its lines below.`);
  }

  async function moveList(list: SiteContentList, direction: -1 | 1) {
    if (!supabase) return;
    const siblings = listsInSection(lists, list.section);
    const index = siblings.findIndex((item) => item.id === list.id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;

    await Promise.all([
      supabase
        .from("site_content_lists")
        .update({ sort_order: swapWith.sort_order })
        .eq("id", list.id),
      supabase
        .from("site_content_lists")
        .update({ sort_order: list.sort_order })
        .eq("id", swapWith.id),
    ]);
    await afterWrite("Order updated.");
  }

  async function deleteList(list: SiteContentList) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("site_content_lists")
      .delete()
      .eq("id", list.id);
    if (deleteError) return setError(deleteError.message);
    await afterWrite(`"${list.title}" deleted.`);
  }

  /**
   * Writes the built-in text into the database. Only offered when the table is
   * empty — the site is showing that same text from code at that point, so
   * this is how it becomes editable.
   */
  async function seedDefaults() {
    if (!supabase) return;
    setIsSeeding(true);
    const { error: insertError } = await supabase
      .from("site_content_lists")
      .insert(
        DEFAULT_CONTENT_LISTS.map(({ section, key, title, tone, items, sort_order }) => ({
          section,
          key,
          title,
          tone,
          items,
          sort_order,
        })),
      );
    setIsSeeding(false);
    if (insertError) return setError(insertError.message);
    await afterWrite("Standard text loaded. It is now editable below.");
  }

  /* --------------------------------------------------------------- render */

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading site content...
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
      <div className="mx-auto max-w-5xl">
        <AdminNav />
        <header className="border-b border-[#06131D]/10 pb-7">
          <h1 className="font-display text-4xl font-semibold text-[#06131D] sm:text-5xl">
            Inclusions &amp; Policies
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-[#526168]">
            The Inclusions, Policies and Important notes tabs on every package
            page. This text is shared — one edit here changes every package at
            once, which is why there is no per-package copy to keep in sync.
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

        {!lists.length && (
          <section className="mt-8 rounded-2xl border border-dashed border-[#D4AF37] bg-[#FFFCF3] p-6">
            <h2 className="font-display text-2xl font-semibold text-[#06131D]">
              Nothing stored yet
            </h2>
            <p className="mt-1 max-w-2xl font-body text-sm text-[#526168]">
              Your package pages are currently showing the standard text built
              into the site. Load it here to make it editable — visitors will
              see no change.
            </p>
            <button
              type="button"
              onClick={seedDefaults}
              disabled={isSeeding}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A] disabled:opacity-60"
            >
              {isSeeding ? "Loading..." : "Load the standard text"}
            </button>
          </section>
        )}

        <div className="mt-8 space-y-8">
          {CONTENT_SECTION_KEYS.map((section) => (
            <SectionPanel
              key={section}
              section={section}
              lists={listsInSection(lists, section)}
              onAdd={addList}
              onSave={saveList}
              onMove={moveList}
              onDelete={deleteList}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* One tab                                                                    */
/* ========================================================================== */

function SectionPanel({
  section,
  lists,
  onAdd,
  onSave,
  onMove,
  onDelete,
}: {
  section: ContentSection;
  lists: SiteContentList[];
  onAdd: (section: ContentSection, title: string) => void;
  onSave: (
    list: SiteContentList,
    changes: { title: string; tone: ContentTone; items: string[] },
  ) => void;
  onMove: (list: SiteContentList, direction: -1 | 1) => void;
  onDelete: (list: SiteContentList) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const { label, hint } = CONTENT_SECTIONS[section];

  return (
    <section className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl font-semibold text-[#06131D]">
          {label}
        </h2>
        <span className="rounded-full bg-[#F3EFEA] px-3 py-1 font-body text-xs font-semibold text-[#526168]">
          Tab on every package page
        </span>
      </div>
      <p className="mt-1 font-body text-sm text-[#526168]">{hint}</p>

      <div className="mt-5 space-y-4">
        {lists.map((list, index) => (
          <ListCard
            key={list.id}
            list={list}
            isFirst={index === 0}
            isLast={index === lists.length - 1}
            onSave={onSave}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
        {!lists.length && (
          <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center font-body text-sm text-[#526168]">
            No lists here yet — this tab is hidden from visitors until one is
            added.
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t border-stone-200 pt-5">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd(section, newTitle);
              setNewTitle("");
            }
          }}
          placeholder={`New heading in ${label}, e.g. Baggage policy`}
          className="h-11 flex-1 rounded-lg border border-stone-200 px-3.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(section, newTitle);
            setNewTitle("");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-4 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A]"
        >
          <FiPlus /> Add list
        </button>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* One list                                                                   */
/* ========================================================================== */

/** One bullet per line — the shape the text already has when it is pasted in. */
function toText(items: string[]): string {
  return items.join("\n");
}

function toItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function ListCard({
  list,
  isFirst,
  isLast,
  onSave,
  onMove,
  onDelete,
}: {
  list: SiteContentList;
  isFirst: boolean;
  isLast: boolean;
  onSave: (
    list: SiteContentList,
    changes: { title: string; tone: ContentTone; items: string[] },
  ) => void;
  onMove: (list: SiteContentList, direction: -1 | 1) => void;
  onDelete: (list: SiteContentList) => void;
}) {
  const [title, setTitle] = useState(list.title);
  const [tone, setTone] = useState<ContentTone>(list.tone);
  const [text, setText] = useState(toText(list.items));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Re-sync after a save or a reorder reload.
  useEffect(() => {
    setTitle(list.title);
    setTone(list.tone);
    setText(toText(list.items));
  }, [list.title, list.tone, list.items]);

  const items = toItems(text);
  const isDirty =
    title.trim() !== list.title ||
    tone !== list.tone ||
    toText(items) !== toText(list.items);

  return (
    <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(list, -1)}
            disabled={isFirst}
            aria-label={`Move ${list.title} up`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronUp />
          </button>
          <button
            type="button"
            onClick={() => onMove(list, 1)}
            disabled={isLast}
            aria-label={`Move ${list.title} down`}
            className="text-[#526168] disabled:opacity-25"
          >
            <FiChevronDown />
          </button>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Heading"
          className="h-10 min-w-[12rem] flex-1 rounded-lg border border-stone-200 bg-white px-3 font-body text-sm font-semibold outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />

        <TonePicker value={tone} onChange={setTone} />

        {isConfirmingDelete ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDelete(list)}
              className="inline-flex h-10 items-center rounded-lg bg-red-600 px-3 font-body text-xs font-bold text-white hover:bg-red-700"
            >
              Delete for good
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="inline-flex h-10 items-center rounded-lg border border-stone-300 px-3 font-body text-xs font-semibold text-[#526168]"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={`Delete ${list.title}`}
            className="inline-flex h-10 items-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50"
          >
            <FiTrash2 />
          </button>
        )}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={Math.min(Math.max(items.length + 1, 4), 20)}
        aria-label={`Lines under ${list.title}`}
        placeholder="One line per bullet point."
        className="mt-3 w-full rounded-lg border border-stone-200 bg-white p-3.5 font-body text-sm leading-relaxed outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-xs text-[#526168]">
          One line per bullet ·{" "}
          {items.length === 1 ? "1 bullet" : `${items.length} bullets`}
          {isDirty ? " · unsaved" : ""}
        </p>
        <button
          type="button"
          onClick={() => onSave(list, { title, tone, items })}
          disabled={!isDirty}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 font-body text-xs font-bold text-[#06131D] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiSave /> Save
        </button>
      </div>
    </div>
  );
}

function TonePicker({
  value,
  onChange,
}: {
  value: ContentTone;
  onChange: (tone: ContentTone) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Heading colour">
      {CONTENT_TONE_KEYS.map((tone) => (
        <button
          key={tone}
          type="button"
          onClick={() => onChange(tone)}
          aria-label={CONTENT_TONES[tone].label}
          aria-pressed={value === tone}
          title={`${CONTENT_TONES[tone].label} heading`}
          style={{ backgroundColor: CONTENT_TONES[tone].swatch }}
          className={`h-6 w-6 rounded-full transition ${
            value === tone
              ? "ring-2 ring-[#06131D] ring-offset-2"
              : "opacity-70 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}
