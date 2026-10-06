"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { formatRupees, paiseToInputValue } from "@/lib/money";
import {
  composeLineDescription,
  ratesForPackage,
  type QuotablePackage,
  type QuotableRate,
} from "@/lib/packages.client";
import type { PackageTierRecord } from "@/lib/taxonomy";

/**
 * Pick a package, a tier and a sharing type, and get a priced line back.
 *
 * THIS IS THE ONLY FILE IN THE QUOTATION FEATURE THAT TOUCHES THE CATALOGUE.
 * Decision 1 of docs/quotations.md permits the coupling and confines it to this
 * directory; keeping it to one component is what makes that a reviewable claim
 * rather than a hope.
 *
 * What comes out is a plain object with no ids in it — a description, a rate in
 * paise, a slug kept only as a note, and the package's features to seed the
 * quotation's inclusions. Every field is editable from that moment on. That is
 * Decision 2: a catalogue price is COPIED into editable text, never linked, so a
 * seasonal re-pricing in November cannot reach back into an offer sent in April.
 *
 * Follows ExpenseFormDialog: a plain fixed overlay rather than a headless
 * component, Escape to close, and state reset every time it opens so a cancelled
 * attempt leaves nothing behind.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

/** What a pick hands back to the editor. Nothing in it is a reference. */
export type PickedLine = {
  description: string;
  /** Already formatted for the editor's text input, as paiseToInputValue does. */
  unitPrice: string;
  quantity: string;
  sourcePackageSlug: string;
  /** Seeds the quotation's inclusions; the editor merges and the admin edits. */
  inclusions: string[];
};

export default function PackagePicker({
  open,
  packages,
  tiers,
  /** The head count already on the quotation, so the line arrives priced for it. */
  defaultQuantity,
  onClose,
  onPick,
}: {
  open: boolean;
  packages: QuotablePackage[];
  tiers: PackageTierRecord[];
  defaultQuantity: number;
  onClose: () => void;
  onPick: (line: PickedLine) => void;
}) {
  const [search, setSearch] = useState("");
  const [slug, setSlug] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [sharing, setSharing] = useState("");
  const [pax, setPax] = useState("1");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSlug(packages[0]?.slug ?? "");
    setTierKey("");
    setSharing("");
    setPax(String(Math.max(defaultQuantity, 1)));
  }, [open, packages, defaultQuantity]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return packages;
    return packages.filter((pkg) =>
      [pkg.name, pkg.category, pkg.destinations, pkg.slug]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [packages, search]);

  const selected = useMemo(
    () => packages.find((pkg) => pkg.slug === slug) ?? null,
    [packages, slug],
  );

  const rates = useMemo(
    () => (selected ? ratesForPackage(selected, tiers) : []),
    [selected, tiers],
  );

  /** Tiers this package actually has rates for, in ladder order. */
  const tierOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rate of rates) {
      if (!seen.has(rate.tierKey)) seen.set(rate.tierKey, rate.tierLabel);
    }
    return [...seen].map(([key, label]) => ({ key, label }));
  }, [rates]);

  const sharingOptions = useMemo(
    () => rates.filter((rate) => rate.tierKey === tierKey),
    [rates, tierKey],
  );

  // Selecting a package, or a tier with different sharing types, must not leave
  // a stale selection pointing at a rate that no longer exists.
  useEffect(() => {
    if (tierOptions.some((option) => option.key === tierKey)) return;
    setTierKey(tierOptions[0]?.key ?? "");
  }, [tierOptions, tierKey]);

  useEffect(() => {
    if (sharingOptions.some((rate) => rate.sharing === sharing)) return;
    setSharing(sharingOptions[0]?.sharing ?? "");
  }, [sharingOptions, sharing]);

  if (!open) return null;

  const rate: QuotableRate | null =
    sharingOptions.find((option) => option.sharing === sharing) ?? null;

  const paxCount = Math.max(Math.round(Number(pax) || 0), 0);
  // Preview only. The editor recomputes with computeLineTotal on save, which is
  // the figure that gets stored.
  const linePreviewPaise = rate ? rate.unitPricePaise * paxCount : 0;

  function commit() {
    if (!selected || !rate) return;
    onPick({
      description: composeLineDescription(selected, rate),
      unitPrice: paiseToInputValue(rate.unitPricePaise),
      quantity: String(Math.max(paxCount, 1)),
      sourcePackageSlug: selected.slug,
      inclusions: selected.features,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#06131D]/60 px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-picker-heading"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="package-picker-heading"
              className="font-display text-3xl font-semibold text-[#06131D]"
            >
              Add from the catalogue
            </h3>
            <p className="mt-1.5 font-body text-sm text-[#526168]">
              Prices come from the published package. Everything is editable once
              it is on the quotation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50"
          >
            <FiX />
          </button>
        </div>

        {packages.length === 0 ? (
          <p
            role="status"
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-800"
          >
            No published packages to quote from. Publish one in Packages, or close
            this and type the line by hand.
          </p>
        ) : (
          <>
            <label className="relative mt-6 block">
              <span className="sr-only">Search packages</span>
              <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#526168]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, city or category"
                className={`${FIELD} pl-10`}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={LABEL}>Package</span>
                <select
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className={FIELD}
                >
                  {matches.length === 0 && <option value="">No matches</option>}
                  {matches.map((pkg) => (
                    <option key={pkg.slug} value={pkg.slug}>
                      {pkg.name}
                      {pkg.destinations ? ` — ${pkg.destinations}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={LABEL}>Tier</span>
                <select
                  value={tierKey}
                  onChange={(event) => setTierKey(event.target.value)}
                  disabled={tierOptions.length === 0}
                  className={FIELD}
                >
                  {tierOptions.length === 0 && (
                    <option value="">No priced tiers</option>
                  )}
                  {tierOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={LABEL}>Sharing</span>
                <select
                  value={sharing}
                  onChange={(event) => setSharing(event.target.value)}
                  disabled={sharingOptions.length === 0}
                  className={FIELD}
                >
                  {sharingOptions.length === 0 && (
                    <option value="">No rates</option>
                  )}
                  {sharingOptions.map((option) => (
                    <option key={option.sharing} value={option.sharing}>
                      {option.sharing} — {formatRupees(option.unitPricePaise, { trimZeroPaise: true })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={LABEL}>Pax</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={pax}
                  onChange={(event) => setPax(event.target.value)}
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={LABEL}>Rate per person</span>
                <input
                  readOnly
                  value={
                    rate
                      ? formatRupees(rate.unitPricePaise, { trimZeroPaise: true })
                      : "—"
                  }
                  className={`${FIELD} bg-stone-50`}
                />
              </label>
            </div>

            {/* The number being read off the phone call, before anything is
                committed: rate x pax, exactly as it will land on the line. */}
            <div className="mt-5 rounded-2xl border border-[#D4AF37]/40 bg-[#FFFCF3] p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#997A15]">
                This line
              </p>
              <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
                {formatRupees(linePreviewPaise, { trimZeroPaise: true })}
              </p>
              <p className="mt-1 font-body text-xs text-[#526168]">
                {rate
                  ? `${paxCount} × ${formatRupees(rate.unitPricePaise, { trimZeroPaise: true })} · ${rate.tierLabel} · ${rate.sharing}`
                  : "Choose a tier and sharing type"}
              </p>
            </div>

            {selected && selected.features.length > 0 && (
              <p className="mt-3 font-body text-xs text-[#526168]">
                {selected.features.length} inclusion
                {selected.features.length === 1 ? "" : "s"} will be copied onto the
                quotation, ready to edit.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={!rate || paxCount < 1}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
              >
                Add to quotation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
