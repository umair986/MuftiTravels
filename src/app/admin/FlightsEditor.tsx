"use client";

import { useState } from "react";
import { FiClipboard, FiPlus, FiTrash2 } from "react-icons/fi";
import DatePicker from "@/app/components/ui/pickers/DatePicker";
import {
  blankFlightLeg,
  FLIGHT_FIELD_MAX,
  hasBaggage,
  isIsoDate,
  MAX_FLIGHT_LEGS,
  parseFlightPaste,
  type Baggage,
  type FlightLeg,
} from "@/lib/flights";

/**
 * The flights and baggage block, for the quotation and the invoice editors
 * alike. Migration 031; src/lib/flights.ts says why the fields are shaped as
 * they are.
 *
 * Paste first, because that is how the details arrive — a carrier name, two
 * leg lines and a baggage line from the agent on WhatsApp. The paste is READ
 * into editable fields, not stored as a blob, so a time the reader got wrong is
 * fixed in a cell rather than by retyping the whole block. A paste it cannot
 * read changes nothing and says so.
 *
 * Empty is a normal answer — "tickets to follow" — and prints nothing.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:bg-stone-50 disabled:text-[#526168]";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

type TextColumn = Exclude<keyof FlightLeg, "date">;

const BEFORE_DATE: { key: TextColumn; label: string; placeholder: string }[] = [
  { key: "airline", label: "Airline", placeholder: "Saudi Airline" },
  { key: "flight_no", label: "Flight", placeholder: "SV 771" },
  { key: "from", label: "From", placeholder: "BOM" },
  { key: "to", label: "To", placeholder: "JED" },
];

const AFTER_DATE: { key: TextColumn; label: string; placeholder: string }[] = [
  { key: "departs", label: "Departs", placeholder: "11:00" },
  { key: "arrives", label: "Arrives", placeholder: "14:15" },
];

const BAGGAGE_FIELDS: { key: keyof Baggage; label: string; placeholder: string }[] =
  [
    { key: "checkin_kg", label: "Check-in kg", placeholder: "20" },
    { key: "checkin_pieces", label: "Check-in pcs", placeholder: "2" },
    { key: "cabin_kg", label: "Cabin kg", placeholder: "7" },
    { key: "cabin_pieces", label: "Cabin pcs", placeholder: "1" },
  ];

export default function FlightsEditor({
  flights,
  baggage,
  onChange,
  onBaggageChange,
  disabled = false,
}: {
  flights: FlightLeg[];
  baggage: Baggage;
  onChange: (next: FlightLeg[]) => void;
  onBaggageChange: (next: Baggage) => void;
  disabled?: boolean;
}) {
  const [isPasting, setIsPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");

  function update(index: number, key: keyof FlightLeg, value: string) {
    const next = [...flights];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }

  function readPaste() {
    const { legs, baggage: readBaggage } = parseFlightPaste(pasted);
    if (!legs.length && !hasBaggage(readBaggage)) {
      setPasteError(
        "Couldn't find a flight in that. Expected a line like “SV 771 BOM-JED 26Dec 11:00 - 14:15” — or add the legs by hand.",
      );
      return;
    }
    // Replaces rather than appends: a second paste is almost always the agent's
    // corrected schedule, not more flights. Each half only when the paste had
    // one, so pasting just the baggage line keeps the legs already there.
    if (legs.length) onChange(legs);
    if (hasBaggage(readBaggage)) onBaggageChange(readBaggage);
    setPasted("");
    setPasteError("");
    setIsPasting(false);
  }

  const textInput = (
    leg: FlightLeg,
    index: number,
    column: { key: TextColumn; label: string; placeholder: string },
  ) => (
    <label key={column.key} className="block">
      {index === 0 && (
        <span className={`${LABEL} hidden sm:block`}>{column.label}</span>
      )}
      <input
        value={leg[column.key]}
        onChange={(event) => update(index, column.key, event.target.value)}
        disabled={disabled}
        maxLength={FLIGHT_FIELD_MAX[column.key]}
        placeholder={column.placeholder}
        aria-label={`${column.label}, leg ${index + 1}`}
        className={`${FIELD} ${
          column.key === "from" || column.key === "to" ? "uppercase" : ""
        }`}
      />
    </label>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${LABEL} mb-0`}>Flights &amp; baggage</p>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setIsPasting((open) => !open);
              setPasteError("");
            }}
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-[#997A15] hover:underline"
          >
            <FiClipboard /> {isPasting ? "Cancel paste" : "Paste from airline"}
          </button>
        )}
      </div>
      <p className="mt-1 font-body text-xs text-[#526168]">
        Optional. Leave empty when the tickets aren&apos;t confirmed yet — the
        PDF then says nothing about flights.
      </p>

      {isPasting && !disabled && (
        <div className="mt-3 rounded-xl border border-[#D4AF37]/50 bg-[#FFFCF3] p-3">
          <textarea
            autoFocus
            rows={5}
            value={pasted}
            onChange={(event) => {
              setPasted(event.target.value);
              setPasteError("");
            }}
            placeholder={
              "Saudi Airline\nSV 771  BOM-JED 26Dec 11:00 - 14:15\nSV 770 JED - BOM 09Jan 2:10 - 09:25\nCheck in Baggage 20Kg x 2pc . Cabin Bag 07Kg x 1pc"
            }
            className={`${FIELD} resize-y font-mono text-xs leading-relaxed`}
          />
          {pasteError && (
            <p className="mt-2 font-body text-xs text-amber-800">{pasteError}</p>
          )}
          <button
            type="button"
            onClick={readPaste}
            disabled={!pasted.trim()}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-3.5 py-2 font-body text-sm font-semibold text-white transition hover:bg-[#0d2333] disabled:opacity-50"
          >
            Read flights
          </button>
          <span className="ml-3 font-body text-xs text-[#526168]">
            A date without a year is read as the next one coming up.
            {flights.length > 0 &&
              ` Replaces the ${flights.length} leg${flights.length === 1 ? "" : "s"} below.`}
          </span>
        </div>
      )}

      {flights.length > 0 && (
        <div className="mt-3 space-y-2">
          {flights.map((leg, index) => {
            const unreadDate = leg.date && !isIsoDate(leg.date);
            return (
              <div
                key={`leg-${index}`}
                className="grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-[1.3fr_1fr_4.25rem_4.25rem_10rem_5rem_5rem_2.25rem] sm:items-end"
              >
                {BEFORE_DATE.map((column) => textInput(leg, index, column))}

                <div className="block">
                  {index === 0 && (
                    <span className={`${LABEL} hidden sm:block`}>Date</span>
                  )}
                  <DatePicker
                    value={isIsoDate(leg.date) ? leg.date : ""}
                    onChange={(value) => update(index, "date", value)}
                    // A return cannot leave before the flight out.
                    min={
                      index > 0 && isIsoDate(flights[index - 1].date)
                        ? flights[index - 1].date
                        : undefined
                    }
                    disabled={disabled}
                    placeholder={unreadDate ? leg.date : "Date"}
                  />
                </div>

                {AFTER_DATE.map((column) => textInput(leg, index, column))}

                {!disabled && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(flights.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove leg ${index + 1}`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50"
                  >
                    <FiTrash2 />
                  </button>
                )}

                {/* A pasted date the reader could not turn into a calendar
                    date. It still prints as typed; picking one replaces it. */}
                {unreadDate && (
                  <p className="font-body text-xs text-amber-800 sm:col-span-8">
                    Read the date as “{leg.date}” — pick it on the calendar to
                    be sure it prints right.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!disabled && flights.length < MAX_FLIGHT_LEGS && (
        <button
          type="button"
          onClick={() =>
            // A return leg is usually the same carrier, so it starts filled in.
            onChange([
              ...flights,
              blankFlightLeg(flights[flights.length - 1]?.airline ?? ""),
            ])
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 font-body text-sm font-semibold text-[#526168] transition hover:bg-stone-50"
        >
          <FiPlus /> Add a flight
        </button>
      )}

      {/* ------------------------------------------------------ baggage --- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BAGGAGE_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className={LABEL}>{field.label}</span>
            <input
              inputMode="numeric"
              value={baggage[field.key] ?? ""}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
                onBaggageChange({
                  ...baggage,
                  [field.key]: digits ? Number(digits) : null,
                });
              }}
              disabled={disabled}
              placeholder={field.placeholder}
              className={FIELD}
            />
          </label>
        ))}
      </div>
      <p className="mt-1 font-body text-xs text-[#526168]">
        Prints as “Check-in 20 kg × 2 pc · Cabin 7 kg × 1 pc”. Leave blank to
        say nothing about baggage.
      </p>
    </div>
  );
}
