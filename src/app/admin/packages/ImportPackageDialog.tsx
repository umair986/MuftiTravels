"use client";

import { ChangeEvent, useMemo, useState } from "react";
import type { PackageTierRecord } from "@/lib/taxonomy";
import {
  MAX_IMPORT_BYTES,
  PACKAGE_IMPORT_EXAMPLE,
  importChanges,
  packageImportPrompt,
  parsePackageImport,
  type ImportedPackage,
} from "@/lib/packageImport";
import { useToast } from "../../components/ui/toast/useToast";

/**
 * Paste or upload the JSON ChatGPT made from a flyer, see what it would
 * change, and copy it into the editor's form. Applying never saves: the admin
 * still reviews the form and clicks Save. See docs/package-import.md.
 */
export default function ImportPackageDialog({
  tiers,
  current,
  hasCityColumns,
  hasFlightColumns,
  hasHotelColumn,
  onApply,
  onClose,
}: {
  tiers: PackageTierRecord[];
  /** The form as it is now, for the "before" column. */
  current: ImportedPackage;
  hasCityColumns: boolean;
  hasFlightColumns: boolean;
  hasHotelColumn: boolean;
  onApply: (data: ImportedPackage) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const toast = useToast();

  const result = useMemo(
    () =>
      text.trim()
        ? parsePackageImport(text, {
            tiers,
            hasCityColumns,
            hasFlightColumns,
            hasHotelColumn,
          })
        : null,
    [text, tiers, hasCityColumns, hasFlightColumns, hasHotelColumn],
  );
  const changes =
    result?.ok ? importChanges(current, result.data, tiers) : [];

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(
        packageImportPrompt(tiers.map((tier) => tier.name)),
      );
      toast.success("Prompt copied.", {
        description: "Paste it into ChatGPT with the flyer attached.",
      });
    } catch {
      toast.error("Could not copy — the browser blocked the clipboard.");
    }
  }

  function downloadExample() {
    const blob = new Blob([JSON.stringify(PACKAGE_IMPORT_EXAMPLE, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "package-example.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(`"${file.name}" is larger than 100 KB — not a package.`);
      return;
    }
    setText(await file.text());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-package-title"
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#06131D]/60 px-4 py-8"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#997A15]">
              From a flyer
            </p>
            <h3
              id="import-package-title"
              className="font-display text-3xl font-semibold text-[#06131D]"
            >
              Import package details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 text-2xl leading-none text-[#526168] hover:text-[#06131D]"
          >
            ×
          </button>
        </div>

        <ol className="mt-4 space-y-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#FAF8F5] p-4 font-body text-sm text-[#06131D]">
          <li>
            <strong>1.</strong> Copy the prompt and paste it into ChatGPT,
            with the flyer image attached.
          </li>
          <li>
            <strong>2.</strong> Paste ChatGPT&apos;s reply below, or upload it
            as a .json file.
          </li>
          <li>
            <strong>3.</strong> Check the preview, apply, then check the form
            and click <strong>Save package</strong>. Nothing goes live before
            that.
          </li>
          <li className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={copyPrompt}
              className="rounded-lg bg-[#D4AF37] px-3 py-2 font-body text-xs font-bold text-[#06131D] hover:bg-[#F3E5AB]"
            >
              Copy ChatGPT prompt
            </button>
            <button
              type="button"
              onClick={downloadExample}
              className="rounded-lg border border-[#06131D]/15 bg-white px-3 py-2 font-body text-xs font-semibold text-[#06131D] hover:border-[#D4AF37]"
            >
              Download example.json
            </button>
          </li>
        </ol>

        <label className="mt-4 block space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
          ChatGPT&apos;s reply
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='{ "name": "20 Days Umrah …", "prices": [ … ] }'
            className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-mono text-xs font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
        <input
          type="file"
          accept="application/json,.json,.txt"
          onChange={handleFile}
          aria-label="Upload a JSON file"
          className="mt-2 block w-full font-body text-xs text-[#526168] file:mr-3 file:rounded-md file:border-0 file:bg-[#06131D] file:px-3 file:py-2 file:font-body file:text-xs file:font-semibold file:text-[#F3E5AB]"
        />

        {result && !result.ok && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
          >
            {result.error}
          </p>
        )}

        {result?.ok && (
          <div className="mt-5 space-y-4">
            <div>
              <h4 className="font-display text-2xl font-semibold text-[#06131D]">
                What will change
              </h4>
              {changes.length ? (
                <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full min-w-[520px] font-body text-xs">
                    <thead className="bg-[#FAF8F5] text-left text-[#526168]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Field</th>
                        <th className="px-3 py-2 font-semibold">Now</th>
                        <th className="px-3 py-2 font-semibold">From the flyer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change) => (
                        <tr
                          key={change.label}
                          className="border-t border-stone-100 align-top"
                        >
                          <td className="px-3 py-2 font-semibold text-[#06131D]">
                            {change.label}
                          </td>
                          <td className="whitespace-pre-line px-3 py-2 text-[#526168]">
                            {change.before}
                          </td>
                          <td className="whitespace-pre-line px-3 py-2 font-semibold text-[#06131D]">
                            {change.after}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 font-body text-xs text-[#526168]">
                  The form already matches — nothing would change.
                </p>
              )}
              {(result.data.prices || result.data.tierHotels) && (
                <p className="mt-2 font-body text-xs text-[#526168]">
                  Imported prices and hotels replace the ones in the form.
                  Hotels go on this package only — the tiers are not changed.
                </p>
              )}
            </div>

            {result.warnings.length > 0 && (
              <Notes
                tone="amber"
                title="Not imported — fill these in by hand"
                items={result.warnings}
              />
            )}
            {result.notes && (
              <Notes tone="stone" title="Note on the flyer" items={[result.notes]} />
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!result?.ok || !changes.length}
            onClick={() => result?.ok && onApply(result.data)}
            className="rounded-lg bg-[#06131D] px-5 py-2.5 font-body text-sm font-bold text-[#F3E5AB] hover:bg-[#0D2A3A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply to form
          </button>
        </div>
      </div>
    </div>
  );
}

function Notes({
  tone,
  title,
  items,
  footer,
}: {
  tone: "amber" | "stone";
  title: string;
  items: string[];
  footer?: string;
}) {
  const box =
    tone === "amber"
      ? "bg-amber-50 text-amber-900"
      : "bg-[#FAF8F5] text-[#06131D] border border-stone-200";
  return (
    <div className={`rounded-lg p-3 font-body text-xs ${box}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {footer && <p className="mt-2 text-[#526168]">{footer}</p>}
    </div>
  );
}
