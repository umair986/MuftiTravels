"use client";

import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORY_KINDS, type ExpenseCategoryKind } from "@/lib/finance";
import { formatRupees, paiseToInputValue, parsePaise } from "@/lib/money";
import type { ExpenseCategory } from "@/lib/expenses";
import { useToast } from "../../../components/ui/toast/useToast";

/**
 * The two admin-owned lists: expense categories, and invoice line presets.
 *
 * They share a screen because they are the same kind of thing — a short list
 * the business maintains for itself, with no schedule and no consequences
 * beyond convenience.
 *
 * The presets deserve a note. Every field on an invoice is typed (see
 * docs/finance-expenses-and-invoicing.md, Decision 5), which is flexible and
 * tedious in equal measure. Picking a preset COPIES its text and rate into the
 * line and then forgets about it: editing the line does not touch the preset,
 * and editing or deleting a preset does not touch any invoice, draft or issued.
 * It is a keyboard shortcut with a table behind it, not a relationship — which
 * is exactly why it does not reintroduce the coupling Decision 5 removes.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

type LinePreset = {
  id: string;
  label: string;
  description: string;
  sac_code: string;
  default_unit_price_paise: number;
  sort_order: number;
  is_active: boolean;
};

export default function ListsPanel() {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [presets, setPresets] = useState<LinePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryKind, setNewCategoryKind] =
    useState<ExpenseCategoryKind>("trip");

  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [newPresetPrice, setNewPresetPrice] = useState("");
  const [newPresetSac, setNewPresetSac] = useState("");

  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }
    const [{ data: categoryRows, error: loadError }, { data: presetRows }] =
      await Promise.all([
        supabase
          .from("expense_categories")
          .select("id, name, kind, sort_order, is_active")
          .order("sort_order")
          .order("name"),
        supabase
          .from("invoice_line_presets")
          .select("*")
          .order("sort_order")
          .order("label"),
      ]);

    if (loadError) {
      setError(
        loadError.message.includes("does not exist")
          ? "Run 017_finance.sql in Supabase to create the finance tables."
          : loadError.message,
      );
    } else {
      setError("");
    }
    setCategories((categoryRows as ExpenseCategory[]) ?? []);
    setPresets((presetRows as LinePreset[]) ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------ categories */

  async function addCategory() {
    if (!supabase) return;
    const name = newCategory.trim();
    if (!name) return;
    if (
      categories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast.error(`"${name}" already exists.`);
      return;
    }

    const nextOrder =
      Math.max(100, ...categories.map((category) => category.sort_order)) + 10;
    const { error: insertError } = await supabase
      .from("expense_categories")
      .insert({ name, kind: newCategoryKind, sort_order: nextOrder });

    if (insertError) {
      toast.error("Could not add that category.", {
        description: insertError.message,
      });
      return;
    }
    setNewCategory("");
    toast.success(`Added "${name}".`);
    void load();
  }

  async function updateCategory(id: string, patch: Partial<ExpenseCategory>) {
    if (!supabase) return;
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? { ...category, ...patch } : category,
      ),
    );
    const { error: updateError } = await supabase
      .from("expense_categories")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      toast.error("Could not update that category.", {
        description: updateError.message,
      });
      void load();
    }
  }

  /**
   * Categories are deactivated rather than deleted. `expenses.category_id` is
   * ON DELETE RESTRICT, so a category with spending against it cannot be
   * removed at all — and should not be: deleting it would orphan the history
   * that makes last year's totals readable.
   */
  async function deactivateCategory(category: ExpenseCategory) {
    setConfirming(null);
    await updateCategory(category.id, { is_active: false });
    toast.success(`"${category.name}" hidden from new expenses.`);
  }

  /* --------------------------------------------------------------- presets */

  async function addPreset() {
    if (!supabase) return;
    const label = newPresetLabel.trim();
    const description = newPresetDescription.trim() || label;
    if (!label) return;

    const price = parsePaise(newPresetPrice) ?? 0;
    const nextOrder =
      Math.max(100, ...presets.map((preset) => preset.sort_order)) + 10;

    const { error: insertError } = await supabase
      .from("invoice_line_presets")
      .insert({
        label,
        description,
        sac_code: newPresetSac.trim(),
        default_unit_price_paise: price,
        sort_order: nextOrder,
      });

    if (insertError) {
      toast.error("Could not add that preset.", {
        description: insertError.message,
      });
      return;
    }
    setNewPresetLabel("");
    setNewPresetDescription("");
    setNewPresetPrice("");
    setNewPresetSac("");
    toast.success(`Added "${label}".`);
    void load();
  }

  /**
   * Presets can be deleted outright, unlike categories: nothing references
   * them. An invoice that used one holds its own copy of the text.
   */
  async function deletePreset(preset: LinePreset) {
    if (!supabase) return;
    setConfirming(null);
    const { error: deleteError } = await supabase
      .from("invoice_line_presets")
      .delete()
      .eq("id", preset.id);
    if (deleteError) {
      toast.error("Could not delete that preset.", {
        description: deleteError.message,
      });
      return;
    }
    toast.success(`Deleted "${preset.label}".`);
    void load();
  }

  async function updatePreset(id: string, patch: Partial<LinePreset>) {
    if (!supabase) return;
    setPresets((current) =>
      current.map((preset) =>
        preset.id === id ? { ...preset, ...patch } : preset,
      ),
    );
    const { error: updateError } = await supabase
      .from("invoice_line_presets")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      toast.error("Could not update that preset.", {
        description: updateError.message,
      });
      void load();
    }
  }

  if (isLoading) {
    return <p className="font-body text-sm text-[#526168]">Loading lists...</p>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* ---------------------------------------------------- categories --- */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-2xl font-semibold text-[#06131D]">
          Expense categories
        </h2>
        <p className="mt-1 font-body text-sm text-[#526168]">
          Trip costs belong to a departure; operating costs belong to the
          business. The split is what keeps a departure&apos;s margin from
          absorbing the office rent.
        </p>

        <div className="mt-5 divide-y divide-stone-100">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-3 py-2.5"
            >
              <input
                value={category.name}
                onChange={(event) =>
                  setCategories((current) =>
                    current.map((item) =>
                      item.id === category.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                onBlur={(event) =>
                  void updateCategory(category.id, {
                    name: event.target.value.trim(),
                  })
                }
                className={`${FIELD} min-w-[10rem] flex-1 ${
                  category.is_active ? "" : "text-stone-400 line-through"
                }`}
              />
              <select
                value={category.kind}
                onChange={(event) =>
                  void updateCategory(category.id, {
                    kind: event.target.value as ExpenseCategoryKind,
                  })
                }
                className={`${FIELD} w-40`}
              >
                {EXPENSE_CATEGORY_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>

              {category.is_active ? (
                confirming === category.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void deactivateCategory(category)}
                      className="rounded-lg bg-[#06131D] px-3 py-1.5 font-body text-xs font-semibold text-[#F3E5AB]"
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="rounded-lg px-2 py-1.5 font-body text-xs text-[#526168] hover:underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(category.id)}
                    aria-label={`Hide ${category.name}`}
                    title="Hide from new expenses"
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-stone-100 hover:text-[#06131D]"
                  >
                    <FiTrash2 />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void updateCategory(category.id, { is_active: true })
                  }
                  className="rounded-lg border border-stone-200 px-3 py-1.5 font-body text-xs font-semibold text-[#526168] transition hover:border-[#D4AF37]"
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-stone-100 pt-5">
          <label className="min-w-[12rem] flex-1">
            <span className="sr-only">New category name</span>
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addCategory();
              }}
              placeholder="Hotel - Jeddah"
              className={FIELD}
            />
          </label>
          <select
            value={newCategoryKind}
            onChange={(event) =>
              setNewCategoryKind(event.target.value as ExpenseCategoryKind)
            }
            className={`${FIELD} w-40`}
          >
            {EXPENSE_CATEGORY_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addCategory()}
            disabled={!newCategory.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-40"
          >
            <FiPlus /> Add
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------- presets --- */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-2xl font-semibold text-[#06131D]">
          Invoice line presets
        </h2>
        <p className="mt-1 font-body text-sm text-[#526168]">
          Saved wording for invoice lines, so a long package description is not
          retyped on every bill. Picking one copies the text and rate into the
          line, where both stay fully editable — changing a preset later never
          changes an invoice.
        </p>

        <div className="mt-5 space-y-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="rounded-xl border border-stone-200 p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={preset.label}
                  onChange={(event) =>
                    setPresets((current) =>
                      current.map((item) =>
                        item.id === preset.id
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                  onBlur={(event) =>
                    void updatePreset(preset.id, {
                      label: event.target.value.trim(),
                    })
                  }
                  placeholder="Short name"
                  className={`${FIELD} min-w-[10rem] flex-1 font-semibold`}
                />
                <input
                  defaultValue={paiseToInputValue(
                    preset.default_unit_price_paise,
                  )}
                  onBlur={(event) =>
                    void updatePreset(preset.id, {
                      default_unit_price_paise:
                        parsePaise(event.target.value) ?? 0,
                    })
                  }
                  inputMode="decimal"
                  placeholder="Rate"
                  className={`${FIELD} w-32`}
                />
                <input
                  value={preset.sac_code}
                  onChange={(event) =>
                    setPresets((current) =>
                      current.map((item) =>
                        item.id === preset.id
                          ? { ...item, sac_code: event.target.value }
                          : item,
                      ),
                    )
                  }
                  onBlur={(event) =>
                    void updatePreset(preset.id, {
                      sac_code: event.target.value.trim(),
                    })
                  }
                  placeholder="SAC"
                  maxLength={12}
                  className={`${FIELD} w-28`}
                />
                {confirming === preset.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void deletePreset(preset)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 font-body text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="rounded-lg px-2 py-1.5 font-body text-xs text-[#526168] hover:underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(preset.id)}
                    aria-label={`Delete ${preset.label}`}
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
              <textarea
                value={preset.description}
                onChange={(event) =>
                  setPresets((current) =>
                    current.map((item) =>
                      item.id === preset.id
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
                onBlur={(event) =>
                  void updatePreset(preset.id, {
                    description: event.target.value.trim(),
                  })
                }
                rows={2}
                maxLength={500}
                placeholder="The text inserted into the invoice line"
                className={`${FIELD} mt-2 resize-y`}
              />
              {preset.default_unit_price_paise > 0 && (
                <p className="mt-1.5 font-body text-xs text-[#526168]">
                  Inserts at {formatRupees(preset.default_unit_price_paise)}
                </p>
              )}
            </div>
          ))}

          {!presets.length && (
            <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center font-body text-sm text-[#526168]">
              No presets yet. Add the package names you bill most often — they
              are only text, so renaming one later changes nothing already
              invoiced.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <input
            value={newPresetLabel}
            onChange={(event) => setNewPresetLabel(event.target.value)}
            placeholder="Short name (e.g. Umrah 14D Deluxe)"
            className={FIELD}
          />
          <div className="flex gap-3">
            <input
              value={newPresetPrice}
              onChange={(event) => setNewPresetPrice(event.target.value)}
              inputMode="decimal"
              placeholder="Rate (₹)"
              className={`${FIELD} flex-1`}
            />
            <input
              value={newPresetSac}
              onChange={(event) => setNewPresetSac(event.target.value)}
              placeholder="SAC"
              maxLength={12}
              className={`${FIELD} w-28`}
            />
          </div>
          <textarea
            value={newPresetDescription}
            onChange={(event) => setNewPresetDescription(event.target.value)}
            rows={2}
            placeholder="Full line text (defaults to the short name)"
            className={`${FIELD} resize-y sm:col-span-2`}
          />
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void addPreset()}
              disabled={!newPresetLabel.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-40"
            >
              <FiPlus /> Add preset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
