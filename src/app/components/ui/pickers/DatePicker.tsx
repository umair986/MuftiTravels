"use client";

import { KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import {
  CurrentDot,
  LONG_MONTHS,
  PickerFooter,
  PickerHeader,
  PickerPopover,
  PickerTrigger,
  SHORT_MONTHS,
  monthCellClass,
  usePickerPopover,
} from "./shell";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const LONG_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A date picker in the house style, replacing `<input type="date">`.
 *
 * The value is the `YYYY-MM-DD` string the native input held, so every
 * caller's state and every column it is saved to are unchanged. Pass `name`
 * inside an uncontrolled `<form>` and a hidden input carries the value into
 * `FormData`, as the native one did.
 *
 * Clicking the month title switches to a month grid for jumping far ahead —
 * a trip a year out should not take twelve clicks.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = "Choose a date",
  clearable = true,
  id,
  name,
  boxClassName,
  marked,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  id?: string;
  /** Renders a hidden input so the value reaches a native form submit. */
  name?: string;
  boxClassName?: string;
  /** Dates to flag with a dot, e.g. ones already added to a list. */
  marked?: string[];
}) {
  const today = localToday();
  const selected = parseDate(value);
  const { open, setOpen, close, position, place, buttonRef, popoverRef } =
    usePickerPopover();
  const [view, setView] = useState<"days" | "months">("days");

  // The month grid is shorter than the day grid; re-anchor so a popover
  // opened above the field stays against it.
  useLayoutEffect(() => {
    if (open) place();
  }, [view, open, place]);
  const [cursor, setCursor] = useState(() => value || clamp(today, min, max));
  const gridRef = useRef<HTMLDivElement>(null);

  const viewYear = Number(cursor.slice(0, 4));
  const viewMonth = Number(cursor.slice(5, 7)) - 1;

  // Keep keyboard focus on the cursor day while the grid is open.
  useEffect(() => {
    if (!open || view !== "days") return;
    const cell = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${cursor}"]`,
    );
    if (cell && gridRef.current?.contains(document.activeElement)) cell.focus();
  }, [cursor, open, view]);

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const isBlocked = (date: string) =>
    Boolean((min && date < min) || (max && date > max));

  const shiftMonth = (delta: number) => {
    const next = addMonths(viewYear, viewMonth, delta);
    setCursor(toIso(next.year, next.month, 1));
  };

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in moves) {
      event.preventDefault();
      setCursor(addDays(cursor, moves[event.key]));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const next = addMonths(viewYear, viewMonth, event.key === "PageUp" ? -1 : 1);
      const day = Math.min(Number(cursor.slice(8)), daysIn(next.year, next.month));
      setCursor(toIso(next.year, next.month, day));
    }
  };

  // Six rows, Sunday first, padded with the neighbouring months' days.
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const gridStart = addDays(toIso(viewYear, viewMonth, 1), -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const markedSet = new Set(marked ?? []);

  const prevBlocked =
    view === "days"
      ? Boolean(min && toIso(viewYear, viewMonth, 1) <= min)
      : Boolean(min && `${viewYear}-01-01` <= min);
  const nextBlocked =
    view === "days"
      ? Boolean(max && toIso(viewYear, viewMonth, daysIn(viewYear, viewMonth)) >= max)
      : Boolean(max && `${viewYear}-12-31` >= max);

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <PickerTrigger
        buttonRef={buttonRef}
        id={id}
        open={open}
        disabled={disabled}
        onToggle={() => {
          if (!open) {
            setView("days");
            setCursor(value || clamp(today, min, max));
          }
          setOpen(!open);
        }}
        onClear={clearable ? () => onChange("") : undefined}
        icon={<FiCalendar className="h-4 w-4" />}
        text={selected ? formatLong(selected) : null}
        placeholder={placeholder}
        boxClassName={boxClassName}
      />

      {open && (
        <PickerPopover popoverRef={popoverRef} position={position} label="Choose a date">
          {view === "days" ? (
            <>
              <PickerHeader
                title={`${LONG_MONTHS[viewMonth]} ${viewYear}`}
                onTitleClick={() => setView("months")}
                titleHint="Pick a month"
                onPrev={() => shiftMonth(-1)}
                onNext={() => shiftMonth(1)}
                prevDisabled={prevBlocked}
                nextDisabled={nextBlocked}
                prevLabel="Previous month"
                nextLabel="Next month"
              />
              <div className="px-3 pt-3">
                <div className="grid grid-cols-7 pb-1">
                  {WEEKDAYS.map((day, index) => (
                    <span
                      key={day}
                      className={`py-1 text-center text-[11px] font-semibold uppercase tracking-wider ${
                        index === 5 ? "text-[#997A15]" : "text-[#526168]"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <div
                  ref={gridRef}
                  role="grid"
                  onKeyDown={onGridKey}
                  className="grid grid-cols-7 gap-y-1 pb-3"
                >
                  {cells.map((date) => {
                    const inMonth = Number(date.slice(5, 7)) - 1 === viewMonth;
                    const isSelected = date === value;
                    const isToday = date === today;
                    const blocked = isBlocked(date);
                    const isMarked = markedSet.has(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        data-date={date}
                        tabIndex={date === cursor ? 0 : -1}
                        disabled={blocked}
                        onClick={() => choose(date)}
                        onFocus={() => setCursor(date)}
                        aria-pressed={isSelected}
                        aria-label={formatLong(parseDate(date)!)}
                        className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                          isSelected
                            ? "bg-[#D4AF37] font-semibold text-[#06131D] shadow-sm"
                            : blocked
                              ? "cursor-not-allowed text-stone-300"
                              : inMonth
                                ? "font-medium text-[#06131D] hover:bg-[#D4AF37]/15 hover:text-[#997A15]"
                                : "text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                        } ${isToday && !isSelected ? "ring-1 ring-inset ring-[#D4AF37]" : ""}`}
                      >
                        {Number(date.slice(8))}
                        {(isToday || isMarked) && (
                          <span
                            className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                              isSelected
                                ? "bg-[#06131D]"
                                : isMarked
                                  ? "bg-[#06131D]/60"
                                  : "bg-[#D4AF37]"
                            }`}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <PickerHeader
                title={String(viewYear)}
                onPrev={() => setCursor(toIso(viewYear - 1, viewMonth, 1))}
                onNext={() => setCursor(toIso(viewYear + 1, viewMonth, 1))}
                prevDisabled={prevBlocked}
                nextDisabled={nextBlocked}
                prevLabel="Previous year"
                nextLabel="Next year"
              />
              <div className="grid grid-cols-3 gap-1.5 p-3">
                {SHORT_MONTHS.map((label, index) => {
                  const first = toIso(viewYear, index, 1);
                  const last = toIso(viewYear, index, daysIn(viewYear, index));
                  const blocked = Boolean(
                    (min && last < min) || (max && first > max),
                  );
                  const isCurrent = first.slice(0, 7) === today.slice(0, 7);
                  const isSelected = Boolean(
                    selected && selected.year === viewYear && selected.month === index,
                  );
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        setCursor(clamp(first, min, max));
                        setView("days");
                      }}
                      className={monthCellClass({
                        selected: isSelected,
                        blocked,
                        past: false,
                        current: isCurrent,
                      })}
                    >
                      {label}
                      {isCurrent && <CurrentDot selected={isSelected} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <PickerFooter
            onClear={clearable ? () => choose("") : undefined}
            todayLabel="Today"
            onToday={() => choose(today)}
            todayDisabled={isBlocked(today)}
          />
        </PickerPopover>
      )}
    </>
  );
}

/** Today on the device's own calendar, as `YYYY-MM-DD` — not UTC's. */
export function localToday(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

function formatLong(date: { year: number; month: number; day: number }): string {
  const weekday = new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay();
  return `${LONG_WEEKDAYS[weekday]}, ${date.day} ${SHORT_MONTHS[date.month]} ${date.year}`;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso)!;
  const next = new Date(Date.UTC(d.year, d.month, d.day + days));
  return toIso(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
}

function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

function clamp(date: string, min?: string, max?: string): string {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}
