"use client";

import {
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

/**
 * The parts `DatePicker` and `MonthPicker` share, so the two read as one
 * control: a trigger that looks like the form field around it, and a
 * portalled popover with a dark-and-gold header and a cream footer.
 *
 * Both replace the native `<input type="date|month">`, whose popup is drawn
 * by the browser — grey, blue and different in Chrome, Safari and Firefox.
 *
 * The popover is fixed-positioned in a portal so a dialog or card with
 * `overflow: auto` cannot clip it, and flips above the field when there is
 * no room below.
 */

export const POPOVER_WIDTH = 304;

export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The default trigger box — the admin's FIELD style. */
export const DEFAULT_TRIGGER_BOX =
  "rounded-lg border border-stone-200 bg-white px-3.5 py-2.5";

export function usePickerPopover() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = popoverRef.current?.offsetHeight ?? 360;
    // Below if it fits, else whichever side has more room — then held inside
    // the viewport, so on a short laptop screen it overlaps the field rather
    // than running off the bottom.
    const spaceBelow = window.innerHeight - rect.bottom;
    const below = spaceBelow >= height + 12 || spaceBelow >= rect.top;
    const top = Math.max(
      8,
      Math.min(
        below ? rect.bottom + 6 : rect.top - height - 6,
        window.innerHeight - height - 8,
      ),
    );
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
    );
    setPosition({ top, left });
  }, []);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
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
    // Capture phase, and stopped: Escape closes the picker, not the
    // dialog the picker happens to sit in.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
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
  }, [open, place, close]);

  return { open, setOpen, close, position, place, buttonRef, popoverRef };
}

export function PickerTrigger({
  buttonRef,
  id,
  open,
  disabled,
  onToggle,
  onClear,
  icon,
  text,
  placeholder,
  boxClassName = DEFAULT_TRIGGER_BOX,
  ariaLabel,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  id?: string;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onClear?: () => void;
  icon: ReactNode;
  text: string | null;
  placeholder: string;
  boxClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={ariaLabel}
      className={`${boxClassName} flex w-full items-center gap-2.5 text-left font-body text-sm font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 ${
        open ? "!border-[#D4AF37] ring-2 ring-[#D4AF37]/20" : "hover:border-[#D4AF37]/60"
      }`}
    >
      <span
        className={`shrink-0 ${text ? "text-[#997A15]" : "text-stone-400"}`}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className={`flex-1 truncate ${text ? "text-[#06131D]" : "text-stone-400"}`}
      >
        {text ?? placeholder}
      </span>
      {onClear && text && !disabled && (
        <span
          role="button"
          tabIndex={-1}
          aria-label="Clear"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onClear();
          }}
          className="-mr-1 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-[#06131D]"
        >
          <FiX className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </button>
  );
}

export function PickerPopover({
  popoverRef,
  position,
  label,
  children,
}: {
  popoverRef: RefObject<HTMLDivElement | null>;
  position: { top: number; left: number } | null;
  label: string;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={label}
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: POPOVER_WIDTH,
      }}
      className="z-[10000] overflow-hidden rounded-xl border border-stone-200 bg-white font-body shadow-[0_18px_50px_-12px_rgba(6,19,29,0.35)]"
    >
      {children}
    </div>,
    document.body,
  );
}

export function PickerHeader({
  title,
  onTitleClick,
  titleHint,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
}: {
  title: string;
  onTitleClick?: () => void;
  titleHint?: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel: string;
  nextLabel: string;
}) {
  const arrow =
    "rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/70";
  const titleClass =
    "font-display text-xl font-semibold tracking-wide text-[#D4AF37]";
  return (
    <div className="flex items-center justify-between bg-[#06131D] px-3 py-2.5 text-white">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label={prevLabel}
        className={arrow}
      >
        <FiChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {onTitleClick ? (
        <button
          type="button"
          onClick={onTitleClick}
          title={titleHint}
          className={`${titleClass} rounded-md px-2 transition hover:bg-white/10`}
        >
          {title}
        </button>
      ) : (
        <span className={titleClass}>{title}</span>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={nextLabel}
        className={arrow}
      >
        <FiChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function PickerFooter({
  onClear,
  todayLabel,
  onToday,
  todayDisabled,
}: {
  onClear?: () => void;
  todayLabel: string;
  onToday: () => void;
  todayDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-stone-100 bg-[#FAF8F5] px-3 py-2">
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-xs font-semibold text-[#526168] transition hover:text-red-700"
        >
          Clear
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        disabled={todayDisabled}
        onClick={onToday}
        className="rounded-md px-2 py-1 text-xs font-semibold text-[#997A15] transition hover:bg-[#D4AF37]/15 disabled:opacity-40"
      >
        {todayLabel}
      </button>
    </div>
  );
}

/** Class for one cell of the 3×4 month grid, shared by both pickers. */
export function monthCellClass({
  selected,
  blocked,
  past,
  current,
}: {
  selected: boolean;
  blocked: boolean;
  past: boolean;
  current: boolean;
}) {
  return `relative rounded-lg py-2.5 text-sm transition ${
    selected
      ? "bg-[#D4AF37] font-semibold text-[#06131D] shadow-sm"
      : blocked
        ? "cursor-not-allowed text-stone-300"
        : past
          ? "text-stone-400 hover:bg-stone-100"
          : "font-medium text-[#06131D] hover:bg-[#D4AF37]/15 hover:text-[#997A15]"
  } ${current && !selected ? "ring-1 ring-inset ring-[#D4AF37]" : ""}`;
}

export function CurrentDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
        selected ? "bg-[#06131D]" : "bg-[#D4AF37]"
      }`}
      aria-hidden
    />
  );
}
