/**
 * Package import from JSON — see docs/package-import.md.
 *
 * Half the packages the business sells arrive as a supplier flyer. The admin
 * hands the flyer to ChatGPT with the prompt below, gets JSON back, and pastes
 * it into the package editor. This file reads that JSON into the fields the
 * editor already has; it never saves anything. The admin reviews the filled
 * form and clicks Save, so a misread digit is caught by a person, not shipped.
 *
 * Pure: no React, no Supabase. The JSON is untrusted text (a model wrote it),
 * so every value is checked here and anything doubtful becomes a warning
 * rather than a guess — an amount like "1,62.786" is skipped, not "fixed".
 *
 * Hotels are imported onto the PACKAGE (tier_hotels, migration 032), never
 * onto the tier: a tier is shared by every package in it, and the hotel moves
 * with the supplier and the month.
 */

import { PACKAGE_CATEGORIES } from "./categoryFields";
import { DEPARTURE_CITIES } from "./departures";
import {
  HOTEL_FIELDS,
  type PackageTierHotels,
  type PackageTierRecord,
} from "./taxonomy";

/** What an import may set. Absent means "keep what the form has". */
export type ImportedPackage = {
  name?: string;
  description?: string;
  category?: string;
  /** A DEPARTURE_CITIES key. */
  departureCity?: string;
  durationDays?: number;
  durationNights?: number;
  destinations?: string;
  /** `YYYY-MM`. */
  validMonth?: string;
  /** `YYYY-MM`, after validMonth. */
  validUntilMonth?: string;
  /** `YYYY-MM-DD`, sorted, unique. */
  departureDates?: string[];
  airline?: string;
  flightRouting?: "" | "direct" | "via";
  flightVia?: string;
  makkahNights?: number;
  madinahNights?: number;
  /** Replaces the whole price table. `tier` is a tier KEY. Rupees. */
  prices?: ImportedPrice[];
  features?: string[];
  /** This package's hotels per tier key; replaces the whole set. */
  tierHotels?: PackageTierHotels;
};

export type ImportedPrice = { tier: string; sharing: string; amount: number };

export type ImportResult =
  | {
      ok: true;
      data: ImportedPackage;
      /** Values that were in the JSON but could not be used. */
      warnings: string[];
      /** The JSON's free-text `notes`, shown and never imported. */
      notes: string;
    }
  | { ok: false; error: string };

export type ImportOptions = {
  tiers: Pick<PackageTierRecord, "key" | "name">[];
  /** False for a row read before migration 026 — city and month are dropped. */
  hasCityColumns?: boolean;
  /** False for a row read before migration 028 — flights and "to" month dropped. */
  hasFlightColumns?: boolean;
  /** False for a row read before migration 032 — hotels dropped. */
  hasHotelColumn?: boolean;
};

/** A pasted reply is a few KB; anything far larger is not a package. */
export const MAX_IMPORT_BYTES = 100 * 1024;

const KNOWN_KEYS = new Set([
  "version",
  "name",
  "description",
  "category",
  "departure_city",
  "duration_days",
  "duration_nights",
  "makkah_nights",
  "madinah_nights",
  "destinations",
  "valid_month",
  "valid_until_month",
  "departure_dates",
  "airline",
  "flight_routing",
  "flight_via",
  "prices",
  "hotels",
  "features",
  "notes",
]);

/**
 * ChatGPT usually answers with a ```json fence and sometimes a sentence
 * around it. Take the fenced block if there is one, otherwise the outermost
 * braces.
 */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim();
}

/** Lower-case, drop a trailing "package", collapse to letters and digits. */
function tierToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bpackages?\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function matchTier(
  value: string,
  tiers: ImportOptions["tiers"],
): ImportOptions["tiers"][number] | undefined {
  const token = tierToken(value);
  if (!token) return undefined;
  return tiers.find(
    (tier) => tierToken(tier.key) === token || tierToken(tier.name) === token,
  );
}

/** "Ex Mumbai", "mumbai", "MUMBAI" → "mumbai". */
export function matchCity(value: string): string | undefined {
  const token = value
    .toLowerCase()
    .replace(/^\s*(ex|from)\s+/, "")
    .trim();
  return DEPARTURE_CITIES.find(
    (city) => city.key === token || city.name.toLowerCase() === token,
  )?.key;
}

/**
 * A rupee amount as a positive whole number, or undefined. Accepts 96786,
 * "96,786", "₹ 1,16,786/-" and "96786.00". Rejects anything whose digits are
 * ambiguous — "1,62.786" could be 162786 or 1627.86, so it is not read at all.
 */
export function parseAmount(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/₹|rs\.?|inr|\/-|\s/gi, "")
    .replace(/\.0+$/, "");
  // Grouped with commas (Indian or Western) or not grouped at all.
  if (!/^(\d+|\d{1,3}(,\d{2})*,\d{3}|\d{1,3}(,\d{3})+)$/.test(cleaned)) {
    return undefined;
  }
  const amount = Number(cleaned.replace(/,/g, ""));
  return amount > 0 ? amount : undefined;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function parsePackageImport(
  text: string,
  options: ImportOptions,
): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "That is larger than 100 KB — not a package." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(text));
  } catch {
    return {
      ok: false,
      error:
        "That is not valid JSON. Copy ChatGPT's whole reply, or ask it to return only the JSON.",
    };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Expected one JSON object, { … }." };
  }

  const input = raw as Record<string, unknown>;
  const data: ImportedPackage = {};
  const warnings: string[] = [];
  const has = (key: string) => input[key] !== undefined && input[key] !== null;
  const hasCity = options.hasCityColumns ?? true;
  const hasFlights = options.hasFlightColumns ?? true;
  const hasHotels = options.hasHotelColumn ?? true;

  if (has("version") && input.version !== 1) {
    warnings.push(`Unknown version ${String(input.version)}; read as version 1.`);
  }
  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`Ignored unknown field "${key}".`);
  }

  function readText(key: string, max: number): string | undefined {
    if (!has(key)) return undefined;
    const value = input[key];
    if (typeof value !== "string" && typeof value !== "number") {
      warnings.push(`"${key}" is not text, so it was skipped.`);
      return undefined;
    }
    const trimmed = String(value).trim();
    if (!trimmed) return undefined;
    if (trimmed.length > max) {
      warnings.push(`"${key}" is longer than ${max} characters, so it was cut.`);
      return trimmed.slice(0, max);
    }
    return trimmed;
  }

  function whole(key: string, min: number, max: number): number | undefined {
    if (!has(key)) return undefined;
    const value = Number(input[key]);
    if (!Number.isInteger(value) || value < min || value > max) {
      warnings.push(
        `"${key}" should be a whole number from ${min} to ${max}, got ${JSON.stringify(input[key])}.`,
      );
      return undefined;
    }
    return value;
  }

  data.name = readText("name", 200);
  data.description = readText("description", 2000);
  data.destinations = readText("destinations", 200);
  data.durationDays = whole("duration_days", 1, 365);
  data.durationNights = whole("duration_nights", 0, 365);
  data.makkahNights = whole("makkah_nights", 0, 365);
  data.madinahNights = whole("madinah_nights", 0, 365);

  const category = readText("category", 80);
  if (category) {
    const match = PACKAGE_CATEGORIES.find(
      (item) => item.toLowerCase() === category.toLowerCase(),
    );
    if (match) data.category = match;
    else
      warnings.push(
        `Category "${category}" is not one of ${PACKAGE_CATEGORIES.join(", ")}, so it was skipped.`,
      );
  }

  const city = readText("departure_city", 80);
  if (city) {
    const key = matchCity(city);
    if (!hasCity) {
      warnings.push("Departure city skipped: migration 026 is not applied yet.");
    } else if (key) data.departureCity = key;
    else warnings.push(`Departure city "${city}" is not one we sell from.`);
  }

  const validMonth = readText("valid_month", 20);
  if (validMonth) {
    if (!hasCity) {
      warnings.push("Month skipped: migration 026 is not applied yet.");
    } else if (isMonth(validMonth)) data.validMonth = validMonth;
    else warnings.push(`"valid_month" should look like 2027-01, got "${validMonth}".`);
  }

  const untilMonth = readText("valid_until_month", 20);
  if (untilMonth) {
    const start = data.validMonth;
    if (!hasCity || !hasFlights) {
      warnings.push("End month skipped: migration 028 is not applied yet.");
    } else if (!isMonth(untilMonth)) {
      warnings.push(
        `"valid_until_month" should look like 2027-02, got "${untilMonth}".`,
      );
    } else if (!start) {
      warnings.push("End month skipped: there is no start month with it.");
    } else if (untilMonth > start) data.validUntilMonth = untilMonth;
    else if (untilMonth < start)
      warnings.push("End month is before the start month, so it was skipped.");
  }

  if (has("departure_dates")) {
    const dates = input.departure_dates;
    if (!hasFlights) {
      warnings.push("Departure dates skipped: migration 028 is not applied yet.");
    } else if (!Array.isArray(dates)) {
      warnings.push('"departure_dates" should be a list like ["2027-01-30"].');
    } else {
      const good = dates.filter(
        (date): date is string => typeof date === "string" && isRealDate(date),
      );
      for (const date of dates) {
        if (!good.includes(date as string)) {
          warnings.push(`Departure date ${JSON.stringify(date)} is not a real YYYY-MM-DD date.`);
        }
      }
      if (good.length) data.departureDates = [...new Set(good)].sort();
    }
  }

  const airline = readText("airline", 80);
  const flightVia = readText("flight_via", 80);
  const routing = readText("flight_routing", 20)?.toLowerCase();
  if ((airline || flightVia || routing) && !hasFlights) {
    warnings.push("Airline and routing skipped: migration 028 is not applied yet.");
  } else {
    data.airline = airline;
    if (routing === "direct") data.flightRouting = "direct";
    else if (routing === "via" || (!routing && flightVia)) {
      data.flightRouting = "via";
      data.flightVia = flightVia;
    } else if (routing) {
      warnings.push(`"flight_routing" should be "direct" or "via", got "${routing}".`);
    }
  }

  if (has("features")) {
    const value = input.features;
    const lines = Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : typeof value === "string"
        ? value.split("\n")
        : [];
    const features = lines.map((item) => item.trim()).filter(Boolean).slice(0, 50);
    if (features.length) data.features = features;
    else warnings.push('"features" should be a list of short lines.');
  }

  if (has("prices")) {
    const rows = input.prices;
    if (!Array.isArray(rows)) {
      warnings.push('"prices" should be a list of { tier, sharing, amount }.');
    } else {
      const seen = new Map<string, ImportedPrice>();
      rows.forEach((row, index) => {
        const where = `Price ${index + 1}`;
        if (!row || typeof row !== "object") {
          warnings.push(`${where} is not an object, so it was skipped.`);
          return;
        }
        const { tier, sharing, amount } = row as Record<string, unknown>;
        const tierLabel = typeof tier === "string" ? tier.trim() : "";
        const match = matchTier(tierLabel, options.tiers);
        if (!match) {
          warnings.push(
            `${where}: tier "${tierLabel || "?"}" is not in Tags & Tiers. Create it there, or rename it in the JSON, then import again.`,
          );
          return;
        }
        const sharingLabel =
          typeof sharing === "string" && sharing.trim()
            ? sharing.trim().slice(0, 40)
            : "";
        if (!sharingLabel) {
          warnings.push(`${where} (${match.name}) has no sharing label, so it was skipped.`);
          return;
        }
        const rupees = parseAmount(amount);
        if (!rupees) {
          warnings.push(
            `${where} (${match.name} · ${sharingLabel}): amount ${JSON.stringify(amount)} is unclear, so it was skipped. Type it in by hand.`,
          );
          return;
        }
        const id = `${match.key}\n${sharingLabel.toLowerCase()}`;
        if (seen.has(id)) {
          warnings.push(`${where} repeats ${match.name} · ${sharingLabel}; the later amount was kept.`);
        }
        seen.set(id, { tier: match.key, sharing: sharingLabel, amount: rupees });
      });
      if (seen.size) data.prices = [...seen.values()];
    }
  }

  if (has("hotels")) {
    const rows = input.hotels;
    if (!hasHotels) {
      warnings.push("Hotels skipped: migration 032 is not applied yet.");
    } else if (!Array.isArray(rows)) {
      warnings.push('"hotels" should be a list of { tier, makkah_hotel, … }.');
    } else {
      const hotels: PackageTierHotels = {};
      rows.forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        const hotel = row as Record<string, unknown>;
        const label = typeof hotel.tier === "string" ? hotel.tier.trim() : "";
        const tier = matchTier(label, options.tiers);
        if (!tier) {
          warnings.push(
            `Hotels ${index + 1}: tier "${label || "?"}" is not in Tags & Tiers, so its hotels were skipped.`,
          );
          return;
        }
        const own: Partial<Record<(typeof HOTEL_FIELDS)[number], string>> = {};
        for (const field of HOTEL_FIELDS) {
          const value = hotel[field];
          if (typeof value === "string" && value.trim()) {
            own[field] = value.trim().slice(0, 120);
          }
        }
        if (Object.keys(own).length) hotels[tier.key] = own;
      });
      if (Object.keys(hotels).length) data.tierHotels = hotels;
    }
  }

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  for (const key of Object.keys(data) as (keyof ImportedPackage)[]) {
    if (data[key] === undefined) delete data[key];
  }
  if (!Object.keys(data).length) {
    return {
      ok: false,
      error: warnings.length
        ? `Nothing could be imported. ${warnings.join(" ")}`
        : "Nothing to import — every field is empty.",
    };
  }
  return { ok: true, data, warnings, notes };
}

/** One line of the preview: a field the import will change. */
export type ImportChange = { label: string; before: string; after: string };

const LABELS: [keyof ImportedPackage, string][] = [
  ["name", "Package name"],
  ["category", "Category"],
  ["departureCity", "Departs from"],
  ["durationDays", "Days"],
  ["durationNights", "Nights"],
  ["makkahNights", "Nights in Makkah"],
  ["madinahNights", "Nights in Madinah"],
  ["destinations", "Destinations"],
  ["validMonth", "Rates valid from"],
  ["validUntilMonth", "Rates valid to"],
  ["departureDates", "Departure dates"],
  ["airline", "Airline"],
  ["flightRouting", "Direct or via"],
  ["flightVia", "Via"],
  ["description", "Description"],
  ["prices", "Prices"],
  ["features", "Features"],
  ["tierHotels", "Hotels"],
];

/**
 * The fields `next` would change in `current`, formatted for people. Fields
 * the import leaves out are not listed — the form keeps them.
 */
export function importChanges(
  current: ImportedPackage,
  next: ImportedPackage,
  tiers: ImportOptions["tiers"],
): ImportChange[] {
  const show = (key: keyof ImportedPackage, value: ImportedPackage[typeof key]) => {
    if (value === undefined || value === "") return "—";
    if (key === "prices") {
      const rows = value as ImportedPrice[];
      return rows.length
        ? rows
            .map(
              (row) =>
                `${tiers.find((tier) => tier.key === row.tier)?.name ?? row.tier} · ${row.sharing} — ₹${row.amount.toLocaleString("en-IN")}`,
            )
            .join("\n")
        : "—";
    }
    if (key === "tierHotels") {
      const lines = Object.entries(value as PackageTierHotels).map(
        ([tierKey, own]) => {
          const name = tiers.find((tier) => tier.key === tierKey)?.name ?? tierKey;
          const place = (hotel?: string, distance?: string) =>
            [hotel, distance].filter(Boolean).join(", ") || "—";
          return `${name}: Makkah ${place(own.makkah_hotel, own.makkah_distance)} · Madinah ${place(own.madinah_hotel, own.madinah_distance)}`;
        },
      );
      return lines.length ? lines.join("\n") : "—";
    }
    if (key === "departureCity") {
      return DEPARTURE_CITIES.find((city) => city.key === value)?.name ?? String(value);
    }
    if (Array.isArray(value)) return value.length ? value.join("\n") : "—";
    return String(value);
  };
  return LABELS.flatMap(([key, label]) => {
    if (next[key] === undefined) return [];
    const before = show(key, current[key]);
    const after = show(key, next[key]);
    return before === after ? [] : [{ label, before, after }];
  });
}

/** The shape ChatGPT is asked to return, filled from a real flyer. */
export const PACKAGE_IMPORT_EXAMPLE = {
  version: 1,
  name: "20 Days Umrah – Shabaan in Makkah & Ramzan in Madinah",
  description:
    "Spend the end of Shabaan in Makkah and begin Ramzan in Madinah. Flights, visa, hotels, 3 meals a day, ziyarat and transport included.",
  category: "Ramzan",
  departure_city: "Mumbai",
  duration_days: 20,
  duration_nights: 19,
  makkah_nights: null,
  madinah_nights: null,
  destinations: "Makkah, Madinah",
  valid_month: "2027-01",
  valid_until_month: "2027-02",
  departure_dates: ["2027-01-30", "2027-02-01"],
  airline: null,
  flight_routing: null,
  flight_via: null,
  prices: [
    { tier: "Budget", sharing: "Sharing", amount: 96786 },
    { tier: "Economic", sharing: "Sharing", amount: 116786 },
    { tier: "Deluxe", sharing: "Sharing", amount: 135786 },
    { tier: "Super Deluxe", sharing: "Sharing", amount: 162786 },
  ],
  hotels: [
    {
      tier: "Budget",
      makkah_hotel: "Rawafed Al Asimah",
      makkah_distance: "1500 m",
      madinah_hotel: "Jood Al Marjaan",
      madinah_distance: "900 m",
    },
    {
      tier: "Economic",
      makkah_hotel: "Burj Deafah",
      makkah_distance: "750 m",
      madinah_hotel: "Mona Salam",
      madinah_distance: "500 m",
    },
    {
      tier: "Deluxe",
      makkah_hotel: "Waha Deafah",
      makkah_distance: "500 m",
      madinah_hotel: "Marjaan International",
      madinah_distance: "100 m",
    },
    {
      tier: "Super Deluxe",
      makkah_hotel: "Elaf Diamond",
      makkah_distance: "300 m",
      madinah_hotel: "Gulnar Taiba",
      madinah_distance: "0 m",
    },
  ],
  features: [
    "Flight",
    "Visa",
    "Hotel stay",
    "Ziyarat",
    "3 times meal",
    "Transport",
    "Laundry",
    "ZamZam",
    "Umrah kit",
    "eSIM",
    "Packaging & wrapping",
  ],
  notes: "Booking with 50% advance (non-refundable).",
};

/**
 * What the admin pastes into ChatGPT above the flyer. The tier names are the
 * live ones from Tags & Tiers, so the model maps "Economic Package" onto
 * whatever the business actually calls that tier.
 */
export function packageImportPrompt(tierNames: string[]): string {
  const tiers = tierNames.length
    ? tierNames.map((name) => `"${name}"`).join(", ")
    : "(none yet)";
  return `Read the attached Umrah/Hajj package flyer and return ONLY one JSON object in exactly the shape of the example below — no explanation, no comments.

Rules:
- Use null for anything the flyer does not clearly state. Never guess or invent.
- "prices": one row per tier and sharing type. "amount" is a plain whole number of rupees, no commas or symbols (₹1,16,786/- → 116786). If a price is unreadable or looks misprinted, still copy it exactly as printed, as a string, so it gets flagged.
- "tier": use one of these names when the flyer's tier is clearly the same: ${tiers}. Otherwise use the flyer's own name.
- "sharing": the room sharing as printed (Sharing, Quint, Quad, Triple, Double). If the flyer only says "Sharing", write "Sharing".
- "category": one of ${PACKAGE_CATEGORIES.map((item) => `"${item}"`).join(", ")}.
- "departure_city": the city flown from (Ex Mumbai → "Mumbai").
- Dates are YYYY-MM-DD; "valid_month" / "valid_until_month" are YYYY-MM — the first and last month of the departure dates.
- "flight_routing": "direct" or "via" only if the flyer says so, else null.
- "hotels": hotel names and distances per tier as printed; write distances like "500 m". Use null for a hotel the flyer does not name.
- "features": one short line per inclusion.
- "notes": anything else important (advance, cancellation), as one sentence.

Example:
${JSON.stringify(PACKAGE_IMPORT_EXAMPLE, null, 2)}`;
}
