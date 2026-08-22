/**
 * Category-specific package fields.
 *
 * Everything a Hajj or Ramzan package needs beyond the shared package form is
 * declared here and stored in packages.details (jsonb). Adding a field is a
 * change to this file — no migration, no new column.
 *
 * Keys are snake_case and permanent: renaming one orphans the data already
 * saved under the old key. Change a `label` freely; change a `key` never.
 */

export type DetailValue = string | number | boolean | string[];
export type PackageDetails = Record<string, DetailValue>;

export type FieldDef =
  | { kind: "text"; key: string; label: string; placeholder?: string; help?: string; showWhen?: ShowWhen }
  | { kind: "number"; key: string; label: string; min?: number; help?: string; showWhen?: ShowWhen }
  | { kind: "select"; key: string; label: string; options: string[]; help?: string; showWhen?: ShowWhen }
  | { kind: "boolean"; key: string; label: string; help?: string; showWhen?: ShowWhen }
  | { kind: "multiselect"; key: string; label: string; options: string[]; help?: string; showWhen?: ShowWhen };

/** Show this field only when another field holds a given value. */
export type ShowWhen = { key: string; equals: DetailValue };

export type CategorySchema = {
  /** Heading for the group in the editor. */
  title: string;
  description: string;
  fields: FieldDef[];
};

/* -------------------------------------------------------------------------- */

const HAJJ: CategorySchema = {
  title: "Hajj details",
  description:
    "The things a Hajj enquiry always asks about. Leave anything blank that does not apply.",
  fields: [
    {
      kind: "text",
      key: "hajj_year",
      label: "Hajj year",
      placeholder: "1447 AH / 2026",
    },
    {
      kind: "select",
      key: "package_type",
      label: "Package type",
      options: ["Shorter Hajj", "Longer Hajj"],
    },
    {
      kind: "select",
      key: "mina_tent_category",
      label: "Mina tent category",
      options: ["Category A", "Category B", "Category C"],
      help: "The tent grade in Mina, which is usually what separates two Hajj prices.",
    },
    {
      kind: "boolean",
      key: "azizia_included",
      label: "Azizia stay included",
    },
    {
      kind: "number",
      key: "azizia_nights",
      label: "Azizia nights",
      min: 0,
      showWhen: { key: "azizia_included", equals: true },
    },
    {
      kind: "boolean",
      key: "mashaer_train",
      label: "Mashaer train included",
      help: "The Makkah–Mina–Arafat rail link, rather than coach transfer.",
    },
    {
      kind: "boolean",
      key: "qurbani_included",
      label: "Qurbani / Dam included",
    },
    {
      kind: "text",
      key: "maktab_number",
      label: "Maktab number",
      placeholder: "e.g. 74",
    },
    { kind: "number", key: "seats_total", label: "Seats total", min: 0 },
    {
      kind: "number",
      key: "seats_left",
      label: "Seats left",
      min: 0,
      help: "Shown to your team only. Nothing on the public site reads this yet.",
    },
    {
      kind: "select",
      key: "registration_route",
      label: "Registration route",
      options: [
        "Nusuk Hajj portal",
        "Haj Committee of India",
        "Private tour operator",
      ],
    },
  ],
};

const RAMZAN: CategorySchema = {
  title: "Ramzan details",
  description:
    "What separates one Ramadan package from another — which part of the month, and what happens at night.",
  fields: [
    {
      kind: "text",
      key: "ramadan_year",
      label: "Ramadan year",
      placeholder: "1447 AH / 2026",
    },
    {
      kind: "select",
      key: "portion",
      label: "Part of Ramadan",
      options: [
        "First 10 nights",
        "Last 10 nights",
        "First 15 days",
        "Last 15 days",
        "Full month",
      ],
    },
    {
      kind: "multiselect",
      key: "laylatul_qadr_nights",
      label: "Laylatul Qadr nights covered",
      options: ["21st", "23rd", "25th", "27th", "29th"],
      help: "Tick the odd nights the stay actually covers.",
    },
    { kind: "boolean", key: "itikaf_arranged", label: "Itikaf arranged" },
    {
      kind: "boolean",
      key: "suhoor_iftar_included",
      label: "Suhoor & Iftar included",
    },
    {
      kind: "text",
      key: "taraweeh_note",
      label: "Taraweeh note",
      placeholder: "e.g. 20 rakat in the Haram, 5 min walk from hotel",
    },
    {
      kind: "boolean",
      key: "moon_sighting_note",
      label: "Dates may shift with the moon sighting",
      help: "Ticking this is a reminder for your team; it is not published yet.",
    },
  ],
};

/* -------------------------------------------------------------------------- */

const SCHEMAS: Record<string, CategorySchema> = {
  Hajj: HAJJ,
  Ramzan: RAMZAN,
};

/** The extra fields for a category, or undefined when it uses the plain form. */
export function schemaForCategory(
  category: string | undefined,
): CategorySchema | undefined {
  return category ? SCHEMAS[category] : undefined;
}

/** Categories that get their own fields — used to label things in the admin. */
export const CATEGORIES_WITH_DETAILS = Object.keys(SCHEMAS);

/**
 * The categories a new package can be filed under. Anything already in the
 * database but missing here still shows up in the picker — this is the
 * suggested list, not a whitelist.
 */
export const PACKAGE_CATEGORIES = [
  "Umrah Fixed Group",
  "Umrah Land Package",
  "Ziyarat",
  "Hajj",
  "Ramzan",
] as const;

/** Whether a conditional field should currently be visible. */
export function isFieldVisible(
  field: FieldDef,
  details: PackageDetails,
): boolean {
  if (!field.showWhen) return true;
  return details[field.showWhen.key] === field.showWhen.equals;
}

/**
 * Drop values whose field is hidden or no longer declared, so a package cannot
 * quietly keep an Azizia night count after Azizia was switched off.
 */
export function pruneDetails(
  schema: CategorySchema | undefined,
  details: PackageDetails,
): PackageDetails {
  if (!schema) return {};
  const kept: PackageDetails = {};
  for (const field of schema.fields) {
    if (!isFieldVisible(field, details)) continue;
    const value = details[field.key];
    if (value === undefined || value === "" ) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (field.kind === "boolean" && value === false) continue;
    kept[field.key] = value;
  }
  return kept;
}
