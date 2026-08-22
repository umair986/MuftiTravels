"use client";

import {
  isFieldVisible,
  type CategorySchema,
  type DetailValue,
  type FieldDef,
  type PackageDetails,
} from "@/lib/categoryFields";

const inputClass =
  "block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

/**
 * Renders the extra fields a category declares. Hajj and Ramzan get their own
 * set; every other category renders nothing at all.
 */
export default function CategoryDetailsFields({
  schema,
  details,
  onChange,
}: {
  schema: CategorySchema;
  details: PackageDetails;
  onChange: (next: PackageDetails) => void;
}) {
  function setValue(key: string, value: DetailValue) {
    onChange({ ...details, [key]: value });
  }

  const visible = schema.fields.filter((field) =>
    isFieldVisible(field, details),
  );

  // Seat counts that contradict each other are worth catching before a
  // customer is told there is space.
  const total = Number(details.seats_total);
  const left = Number(details.seats_left);
  const seatsInconsistent =
    Number.isFinite(total) && Number.isFinite(left) && left > total;

  return (
    <section className="rounded-xl border border-[#06131D]/10 bg-[#FAF8F5] p-4 sm:col-span-2">
      <h4 className="font-display text-2xl font-semibold text-[#06131D]">
        {schema.title}
      </h4>
      <p className="mt-1 text-xs font-normal text-[#526168]">
        {schema.description}
      </p>

      {seatsInconsistent && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs font-normal text-amber-800">
          Seats left ({left}) is higher than seats total ({total}).
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {visible.map((field) => (
          <DetailField
            key={field.key}
            field={field}
            value={details[field.key]}
            onChange={(value) => setValue(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

function DetailField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: DetailValue | undefined;
  onChange: (value: DetailValue) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <label className="flex items-start gap-3 self-start rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-body text-sm font-semibold text-[#06131D]">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#D4AF37]"
        />
        <span>
          {field.label}
          {field.help && (
            <span className="mt-1 block text-xs font-normal text-[#526168]">
              {field.help}
            </span>
          )}
        </span>
      </label>
    );
  }

  if (field.kind === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-1.5 font-body text-sm font-semibold text-[#06131D] sm:col-span-2">
        <legend>{field.label}</legend>
        <div className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-white p-3">
          {field.options.map((option) => {
            const isOn = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((item) => item !== option)
                      : [...selected, option],
                  )
                }
                aria-pressed={isOn}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isOn
                    ? "bg-[#D4AF37] text-[#06131D]"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {field.help && (
          <p className="text-xs font-normal text-[#526168]">{field.help}</p>
        )}
      </fieldset>
    );
  }

  return (
    <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
      {field.label}
      {field.kind === "select" ? (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Not set</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.kind === "number" ? "number" : "text"}
          value={
            typeof value === "string" || typeof value === "number" ? value : ""
          }
          min={field.kind === "number" ? field.min : undefined}
          placeholder={field.kind === "text" ? field.placeholder : undefined}
          onChange={(event) =>
            onChange(
              field.kind === "number"
                ? event.target.value === ""
                  ? ""
                  : Number(event.target.value)
                : event.target.value,
            )
          }
          className={inputClass}
        />
      )}
      {field.help && (
        <span className="block text-xs font-normal text-[#526168]">
          {field.help}
        </span>
      )}
    </label>
  );
}
