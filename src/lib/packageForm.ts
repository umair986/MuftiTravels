/**
 * The package editor's form, and how it maps to and from a `packages` row.
 *
 * Pure — no React, no Supabase — so the rules a save applies (the starting
 * price, the end month, which columns a row from before a migration may be
 * written) can be tested without rendering the editor.
 */

import type { CmsPackageRecord } from "@/lib/packages";
import {
  pruneDetails,
  schemaForCategory,
  stayNights,
  type PackageDetails,
} from "@/lib/categoryFields";
import { cleanTierHotels, type PackageTierHotels } from "@/lib/taxonomy";
import { fromMonthInput, toMonthInput } from "@/lib/departures";
import type { ImportedPackage } from "@/lib/packageImport";

export type PriceRow = {
  id: number;
  /** A key from public.package_tiers, never a display name. */
  tier: string;
  /** Free-text label the admin gives this row (e.g. Quint, Double, Per Person). */
  sharing: string;
  amount: string;
};

export type FormState = {
  name: string;
  description: string;
  imageUrl: string;
  durationDays: string;
  durationNights: string;
  destinations: string;
  features: string;
  prices: PriceRow[];
  /** Keys from public.package_tags. */
  cardTags: string[];
  /** Category-specific fields; see lib/categoryFields.ts. */
  details: PackageDetails;
  category: string;
  rating: string;
  reviews: string;
  isPublished: boolean;
  /** Migration 026: a DEPARTURE_CITIES key, or "" for not city-specific. */
  departureCity: string;
  /** Migration 026: `YYYY-MM` as the month input holds it, or "" for none. */
  validMonth: string;
  /**
   * Migration 028: the last month the rates cover, `YYYY-MM`, or "" when they
   * cover only validMonth.
   */
  validUntilMonth: string;
  /** Migration 028: flight dates, `YYYY-MM-DD`, kept sorted. */
  departureDates: string[];
  airline: string;
  flightRouting: "" | "direct" | "via";
  flightVia: string;
  /**
   * Migration 027: the price the card leads with, as cardPriceValue(tier,
   * sharing), or "" for the lowest. One string so a single select holds it.
   */
  cardPrice: string;
  /**
   * Migration 032: this package's hotels per tier key. A blank field shows
   * the tier's own (from Tags & Tiers) on the site.
   */
  tierHotels: PackageTierHotels;
};

export const emptyForm: FormState = {
  name: "",
  description: "",
  imageUrl: "",
  durationDays: "",
  durationNights: "",
  destinations: "",
  features: "",
  prices: [],
  cardTags: [],
  details: {},
  category: "",
  rating: "5",
  reviews: "0",
  isPublished: true,
  departureCity: "",
  validMonth: "",
  validUntilMonth: "",
  departureDates: [],
  airline: "",
  flightRouting: "",
  flightVia: "",
  cardPrice: "",
  tierHotels: {},
};

/** Joins tier key and sharing label; neither can contain a line break. */
export const CARD_PRICE_SEPARATOR = "\n";

export function cardPriceValue(tier: string, sharing: string) {
  return `${tier}${CARD_PRICE_SEPARATOR}${sharing}`;
}

export function pricesToRows(prices: CmsPackageRecord["prices"]): PriceRow[] {
  return Object.entries(prices).flatMap(([tier, sharingPrices], tierIndex) =>
    Object.entries(sharingPrices ?? {}).map(([sharing, amount], rowIndex) => ({
      id: tierIndex * 100 + rowIndex,
      tier,
      sharing,
      amount: String(amount),
    })),
  );
}

export function rowsToPrices(rows: PriceRow[]) {
  return rows.reduce<Record<string, Record<string, number>>>((prices, row) => {
    if (!row.amount || Number(row.amount) <= 0) return prices;
    prices[row.tier] ??= {};
    prices[row.tier][row.sharing] = Number(row.amount);
    return prices;
  }, {});
}

function featureLines(text: string): string[] {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A loaded row as the form edits it. */
export function recordToForm(record: CmsPackageRecord): FormState {
  return {
    name: record.name,
    description: record.description,
    imageUrl: record.image_url,
    durationDays: String(record.duration_days),
    durationNights: String(record.duration_nights),
    destinations: record.destinations,
    features: record.features.join("\n"),
    cardTags: record.card_tags ?? [],
    details: record.details ?? {},
    category: record.category,
    rating: String(record.rating ?? 5),
    reviews: String(record.reviews ?? 0),
    prices: pricesToRows(record.prices),
    isPublished: record.is_published,
    departureCity: record.departure_city ?? "",
    validMonth: toMonthInput(record.valid_month),
    validUntilMonth: toMonthInput(record.valid_until_month),
    departureDates: [...(record.departure_dates ?? [])].sort(),
    airline: record.airline ?? "",
    flightRouting: record.flight_routing ?? "",
    flightVia: record.flight_via ?? "",
    cardPrice:
      record.card_price_tier && record.card_price_sharing
        ? cardPriceValue(record.card_price_tier, record.card_price_sharing)
        : "",
    tierHotels: record.tier_hotels ?? {},
  };
}

/**
 * The `packages` update a save sends. `record` is the row as loaded: a column
 * it lacks belongs to a migration not yet applied, and writing it would fail
 * the whole save, so it is left out.
 */
export function formToUpdate(form: FormState, record: CmsPackageRecord) {
  const prices = rowsToPrices(form.prices);
  const amounts = form.prices
    .map((row) => Number(row.amount))
    .filter((amount) => amount > 0);

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    image_url: form.imageUrl.trim(),
    duration_days: Number(form.durationDays),
    duration_nights: Number(form.durationNights),
    destinations: form.destinations.trim(),
    features: featureLines(form.features),
    starting_price: amounts.length ? Math.min(...amounts) : 0,
    prices,
    card_tags: form.cardTags,
    category: form.category,
    rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
    reviews: Math.max(0, Number(form.reviews) || 0),
    // Every category has detail fields (the Makkah/Madinah nights), pruned
    // against the category being SAVED, so switching a package from Ramzan to
    // Umrah drops the Ramadan-only values. Migration 007.
    ...("details" in record
      ? {
          details: pruneDetails(
            schemaForCategory(form.category || record.category),
            form.details,
          ),
        }
      : {}),
    is_published: form.isPublished,
    // Migration 026.
    ...("departure_city" in record
      ? {
          departure_city: form.departureCity,
          valid_month: fromMonthInput(form.validMonth),
        }
      : {}),
    // Migration 028. An end month that is blank, or not after the start, saves
    // as null — "just the one month".
    ...("valid_until_month" in record
      ? (() => {
          const start = fromMonthInput(form.validMonth);
          const end = fromMonthInput(form.validUntilMonth);
          return {
            valid_until_month: start && end && end > start ? end : null,
            departure_dates: form.departureDates,
            airline: form.airline.trim(),
            flight_routing: form.flightRouting,
            flight_via: form.flightRouting === "via" ? form.flightVia.trim() : "",
          };
        })()
      : {}),
    // Migration 032.
    ...("tier_hotels" in record
      ? { tier_hotels: cleanTierHotels(form.tierHotels, Object.keys(prices)) }
      : {}),
    // Migration 027.
    ...("card_price_tier" in record
      ? (() => {
          const [tier = "", sharing = ""] = form.cardPrice
            ? form.cardPrice.split(CARD_PRICE_SEPARATOR)
            : [];
          return { card_price_tier: tier, card_price_sharing: sharing };
        })()
      : {}),
  };
}

/** The form in the import's terms, for the preview's "before" column. */
export function formToImported(form: FormState): ImportedPackage {
  const nights = stayNights(form.details);
  return {
    name: form.name,
    description: form.description,
    category: form.category,
    departureCity: form.departureCity,
    durationDays: Number(form.durationDays) || undefined,
    durationNights: form.durationNights === "" ? undefined : Number(form.durationNights),
    destinations: form.destinations,
    validMonth: form.validMonth,
    validUntilMonth: form.validUntilMonth,
    departureDates: form.departureDates,
    airline: form.airline,
    flightRouting: form.flightRouting,
    flightVia: form.flightVia,
    makkahNights: nights.makkah || undefined,
    madinahNights: nights.madinah || undefined,
    prices: form.prices
      .filter((row) => Number(row.amount) > 0)
      .map((row) => ({
        tier: row.tier,
        sharing: row.sharing,
        amount: Number(row.amount),
      })),
    features: featureLines(form.features),
    tierHotels: form.tierHotels,
  };
}

/**
 * Copy an import into the form. Only what the import holds is touched;
 * imported prices replace the whole table, and a card-price pick whose row is
 * gone falls back to the lowest. Nothing is saved — see packageImport.ts.
 */
export function applyImported(form: FormState, data: ImportedPackage): FormState {
  const next = { ...form };
  if (data.name !== undefined) next.name = data.name;
  if (data.description !== undefined) next.description = data.description;
  if (data.category !== undefined) next.category = data.category;
  if (data.departureCity !== undefined) next.departureCity = data.departureCity;
  if (data.durationDays !== undefined) next.durationDays = String(data.durationDays);
  if (data.durationNights !== undefined)
    next.durationNights = String(data.durationNights);
  if (data.destinations !== undefined) next.destinations = data.destinations;
  if (data.validMonth !== undefined) {
    next.validMonth = data.validMonth;
    // A new start month makes the old end month meaningless.
    next.validUntilMonth = data.validUntilMonth ?? "";
  } else if (data.validUntilMonth !== undefined) {
    next.validUntilMonth = data.validUntilMonth;
  }
  if (data.departureDates !== undefined) next.departureDates = data.departureDates;
  if (data.airline !== undefined) next.airline = data.airline;
  if (data.flightRouting !== undefined) {
    next.flightRouting = data.flightRouting;
    next.flightVia = data.flightRouting === "via" ? (data.flightVia ?? "") : "";
  }
  if (data.makkahNights !== undefined || data.madinahNights !== undefined) {
    next.details = {
      ...form.details,
      ...(data.makkahNights !== undefined && { makkah_nights: data.makkahNights }),
      ...(data.madinahNights !== undefined && {
        madinah_nights: data.madinahNights,
      }),
    };
  }
  if (data.features !== undefined) next.features = data.features.join("\n");
  if (data.tierHotels !== undefined) next.tierHotels = data.tierHotels;
  if (data.prices !== undefined) {
    const start = Math.max(0, ...form.prices.map((row) => row.id)) + 1;
    next.prices = data.prices.map((row, index) => ({
      id: start + index,
      tier: row.tier,
      sharing: row.sharing,
      amount: String(row.amount),
    }));
    if (
      !next.prices.some(
        (row) => cardPriceValue(row.tier, row.sharing) === form.cardPrice,
      )
    ) {
      next.cardPrice = "";
    }
  }
  return next;
}
