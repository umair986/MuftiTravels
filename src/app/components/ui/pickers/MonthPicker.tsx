"use client";

import { useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { currentIstMonth } from "@/lib/departures";
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

/**
 * A month picker in the house style, replacing `<input type="month">`.
 *
 * The value is the same `YYYY-MM` string the native input held, so
 * `toMonthInput` / `fromMonthInput` in `src/lib/departures.ts` still apply.
 * "This month" is the IST month, matching the select policy — not the
 * device clock's.
 */
export default function MonthPicker({
  value,
  onChange,
  min,
  disabled = false,
  placeholder = "Choose a month",
  clearable = true,
  id,
  boxClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  id?: string;
  boxClassName?: string;
}) {
  const nowMonth = currentIstMonth().slice(0, 7);
  const selected = parseMonth(value);
  const { open, setOpen, close, position, buttonRef, popoverRef } =
    usePickerPopover();
  const [viewYear, setViewYear] = useState(
    () => selected?.year ?? Number(nowMonth.slice(0, 4)),
  );
  const minYear = min ? Number(min.slice(0, 4)) : null;

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  return (
    <>
      <PickerTrigger
        buttonRef={buttonRef}
        id={id}
        open={open}
        disabled={disabled}
        onToggle={() => {
          if (!open) setViewYear(selected?.year ?? Number(nowMonth.slice(0, 4)));
          setOpen(!open);
        }}
        onClear={clearable ? () => onChange("") : undefined}
        icon={<FiCalendar className="h-4 w-4" />}
        text={selected ? `${LONG_MONTHS[selected.month]} ${selected.year}` : null}
        placeholder={placeholder}
        boxClassName={boxClassName}
      />

      {open && (
        <PickerPopover popoverRef={popoverRef} position={position} label="Choose a month">
          <PickerHeader
            title={String(viewYear)}
            onPrev={() => setViewYear((year) => year - 1)}
            onNext={() => setViewYear((year) => year + 1)}
            prevDisabled={minYear !== null && viewYear <= minYear}
            prevLabel="Previous year"
            nextLabel="Next year"
          />
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {SHORT_MONTHS.map((label, index) => {
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
                  className={monthCellClass({
                    selected: isSelected,
                    blocked: isBlocked,
                    past: isPast,
                    current: isCurrent,
                  })}
                >
                  {label}
                  {isCurrent && <CurrentDot selected={isSelected} />}
                </button>
              );
            })}
          </div>
          <PickerFooter
            onClear={clearable ? () => choose("") : undefined}
            todayLabel="This month"
            onToday={() => choose(nowMonth)}
            todayDisabled={Boolean(min && nowMonth < min)}
          />
        </PickerPopover>
      )}
    </>
  );
}

function parseMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(match[1]), month };
}
