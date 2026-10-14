"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { currentIstMonth } from "@/lib/departures";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const POPOVER_WIDTH = 288;

/**
 * A month picker in the house style, replacing `<input type="month">`, whose
 * native popup is a grey browser list that looks nothing like the dashboard
 * (and differs between Chrome, Safari and Firefox).
 *
 * The value is the same `YYYY-MM` string the native input held, so
 * `toMonthInput` / `fromMonthInput` in `src/lib/departures.ts` still apply.
 * "This month" is the IST month, matching the select policy — not the
 * device clock's.
 *
 * The popover is portalled and fixed-positioned so a dialog with
 * `overflow: auto` cannot clip it.
 */
export default function MonthPicker({
  value,
  onChange,
  min,
  disabled = false,
  placeholder = "Choose a month",
  clearable = true,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  id?: string;
}) {
  const nowMonth = currentIstMonth().slice(0, 7);
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => selected?.year ?? Number(nowMonth.slice(0, 4)),
  );
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const popoverHeight = popoverRef.current?.offsetHeight ?? 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < popoverHeight + 12 && rect.top > popoverHeight + 12
        ? rect.top - popoverHeight - 6
        : rect.bottom + 6;
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
    );
    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const toggle = () => {
    if (disabled) return;
    if (!open) setViewYear(selected?.year ?? Number(nowMonth.slice(0, 4)));
    setOpen((was) => !was);
  };

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const minYear = min ? Number(min.slice(0, 4)) : null;

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`group flex w-full items-center gap-2.5 rounded-lg border bg-white px-3.5 py-2.5 text-left font-body text-sm font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 ${
          open ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20" : "border-stone-200 hover:border-[#D4AF37]/60"
        }`}
      >
        <FiCalendar
          className={`h-4 w-4 shrink-0 ${selected ? "text-[#997A15]" : "text-stone-400"}`}
          aria-hidden
        />
        <span className={`flex-1 truncate ${selected ? "text-[#06131D]" : "text-stone-400"}`}>
          {selected ? `${LONG_MONTHS[selected.month]} ${selected.year}` : placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear month"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            className="-mr-1 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-[#06131D]"
          >
            <FiX className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose a month"
            style={{
              position: "fixed",
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: POPOVER_WIDTH,
            }}
            className="z-[1000] overflow-hidden rounded-xl border border-stone-200 bg-white font-body shadow-[0_18px_50px_-12px_rgba(6,19,29,0.35)]"
          >
            <div className="flex items-center justify-between bg-[#06131D] px-3 py-2.5 text-white">
              <button
                type="button"
                onClick={() => setViewYear((year) => year - 1)}
                disabled={minYear !== null && viewYear <= minYear}
                aria-label="Previous year"
                className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/70"
              >
                <FiChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="font-display text-xl font-semibold tracking-wide text-[#D4AF37]">
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear((year) => year + 1)}
                aria-label="Next year"
                className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-[#D4AF37]"
              >
                <FiChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-3">
              {MONTHS.map((label, index) => {
                const monthValue = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
                const isSelected = monthValue === value;
                const isCurrent = monthValue === nowMonth;
                const isPast = monthValue < nowMonth;
                const isBlocked = Boolean(min && monthValue < min);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => choose(monthValue)}
                    aria-pressed={isSelected}
                    title={isPast && !isBlocked ? "This month is already over" : undefined}
                    className={`relative rounded-lg py-2.5 text-sm transition ${
                      isSelected
                        ? "bg-[#D4AF37] font-semibold text-[#06131D] shadow-sm"
                        : isBlocked
                          ? "cursor-not-allowed text-stone-300"
                          : isPast
                            ? "text-stone-400 hover:bg-stone-100"
                            : "font-medium text-[#06131D] hover:bg-[#D4AF37]/15 hover:text-[#997A15]"
                    } ${isCurrent && !isSelected ? "ring-1 ring-inset ring-[#D4AF37]" : ""}`}
                  >
                    {label}
                    {isCurrent && (
                      <span
                        className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                          isSelected ? "bg-[#06131D]" : "bg-[#D4AF37]"
                        }`}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 bg-[#FAF8F5] px-3 py-2">
              {clearable ? (
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[#526168] transition hover:text-red-700"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={Boolean(min && nowMonth < min)}
                onClick={() => choose(nowMonth)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-[#997A15] transition hover:bg-[#D4AF37]/15 disabled:opacity-40"
              >
                This month
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function parse(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(match[1]), month };
}
