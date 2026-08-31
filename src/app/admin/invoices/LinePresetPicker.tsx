"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { formatRupees } from "@/lib/money";
import type { LinePreset } from "@/lib/invoices";

/**
 * Inserts saved wording into a line, then gets out of the way.
 *
 * Picking a preset COPIES its description, SAC and rate into the item and
 * forgets about it — no id is stored, nothing is linked. Editing the line does
 * not touch the preset; editing or deleting the preset does not touch any
 * invoice, draft or issued. That is the whole point: it buys back the
 * keystrokes that free-text lines cost without reintroducing the coupling
 * Decision 5 removes.
 */
export default function LinePresetPicker({
  presets,
  onPick,
}: {
  presets: LinePreset[];
  onPick: (preset: LinePreset) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  if (!presets.length) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm font-semibold text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
      >
        Insert saved line <FiChevronDown className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1.5 max-h-72 w-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"
        >
          {presets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onPick(preset);
                  setIsOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#FFFCF3]"
              >
                <span className="block font-body text-sm font-semibold text-[#06131D]">
                  {preset.label}
                </span>
                <span className="mt-0.5 block font-body text-xs text-[#526168]">
                  {preset.default_unit_price_paise > 0
                    ? formatRupees(preset.default_unit_price_paise, {
                        trimZeroPaise: true,
                      })
                    : "No default rate"}
                  {preset.sac_code ? ` · SAC ${preset.sac_code}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
