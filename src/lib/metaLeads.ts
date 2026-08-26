/**
 * Meta lead ads: statuses, and turning a downloaded sheet into rows.
 *
 * Meta's "Download leads" export is not one fixed format — the standard columns
 * are always there, but every custom question on the lead form adds another,
 * and the labels are whatever the form asks ("Which city are you from?").
 * So nothing here matches a header exactly; it normalises headers and looks for
 * known shapes, keeping the whole original row in `raw` either way.
 */

export const META_LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "not_picked_up", label: "Not picked up" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "closed", label: "Closed" },
] as const;

export type MetaLeadStatus = (typeof META_LEAD_STATUSES)[number]["value"];

export function statusLabel(status: string) {
  return (
    META_LEAD_STATUSES.find((option) => option.value === status)?.label ??
    status
  );
}

/** Tailwind classes per status, so the badge reads at a glance. */
export const STATUS_STYLES: Record<string, string> = {
  new: "bg-[#FFFCF3] text-[#997A15] border-[#D4AF37]",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  not_picked_up: "bg-amber-50 text-amber-700 border-amber-200",
  interested: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_interested: "bg-stone-100 text-stone-600 border-stone-300",
  closed: "bg-stone-100 text-stone-500 border-stone-300",
};

export type MetaLeadRecord = {
  id: string;
  dedupe_key: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  form_name: string;
  raw: Record<string, string>;
  /** The lead form's custom questions and their answers, ready to display. */
  extra: Record<string, string>;
  status: MetaLeadStatus;
  admin_notes: string;
  created_at: string;
  imported_at: string;
};

/** A row ready to insert. Mirrors the table minus its defaults. */
export type ParsedMetaLead = {
  dedupe_key: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  form_name: string;
  raw: Record<string, string>;
  extra: Record<string, string>;
  created_at: string;
};

export type ParseResult = {
  rows: ParsedMetaLead[];
  /**
   * The lead form's own questions, detected in the file. Shown before importing
   * so it is obvious what was picked up beyond name/phone/email/city.
   */
  extraHeaders: string[];
  /** Rows dropped for having no phone and no name; nothing can be done with those. */
  skipped: number;
  /** Duplicate dedupe keys within the file itself. */
  duplicatesInFile: number;
  /**
   * Kept rows with no usable phone number. Almost always means the sheet was
   * opened and saved in Excel, which rewrites a long number as 9.19867E+11.
   */
  missingPhone: number;
};

/** "Phone Number" / "phone_number" / "phone-number" all collapse to "phonenumber". */
function normaliseHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Meta bookkeeping columns. Real, but of no use to whoever is calling the lead.
 */
const NOISE_HEADERS = new Set([
  "adid",
  "adsetid",
  "campaignid",
  "formid",
  "isorganic",
  "platform",
  "leadstatus",
  "retaileritemid",
  "partnername",
  "organic",
]);

function isNoiseHeader(header: string) {
  return NOISE_HEADERS.has(normaliseHeader(header));
}

/**
 * Field candidates in priority order. First matching header wins, so
 * `full_name` beats a custom question that merely contains "name".
 */
const FIELD_CANDIDATES: Record<string, string[]> = {
  externalId: ["id", "leadid", "leadgenid"],
  name: ["fullname", "name", "yourname", "fullname2"],
  phone: [
    "phonenumber",
    "phone",
    "mobilenumber",
    "mobile",
    "contactnumber",
    "whatsappnumber",
  ],
  email: ["email", "emailaddress", "youremail"],
  city: ["city", "town", "departurecity", "yourcity", "whichcityareyoufrom"],
  createdAt: ["createdtime", "created", "date", "submittedon", "datetime"],
  campaign: ["campaignname", "campaign"],
  adset: ["adsetname", "adset"],
  ad: ["adname", "ad"],
  form: ["formname", "form"],
};

function findHeader(headers: string[], candidates: string[]) {
  const normalised = headers.map(normaliseHeader);
  // Exact match first — a header called "email" should never lose to
  // "emailconsent" just because it appears later in the sheet.
  for (const candidate of candidates) {
    const index = normalised.indexOf(candidate);
    if (index !== -1) return headers[index];
  }
  for (const candidate of candidates) {
    const index = normalised.findIndex((header) => header.includes(candidate));
    if (index !== -1) return headers[index];
  }
  return null;
}

/**
 * Meta writes phone numbers as `p:+919323063712` in some exports, and Excel
 * will happily turn a long number into `9.19323E+11`. Keep digits and a leading
 * plus; reject anything that survived as scientific notation.
 */
function cleanPhone(value: string) {
  const withoutPrefix = value.replace(/^p:/i, "").trim();
  if (/e\+/i.test(withoutPrefix)) return "";
  const digits = withoutPrefix.replace(/[^\d+]/g, "");
  return digits.slice(0, 32);
}

function cleanEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  // Matches the CHECK on public.enquiries, so a bad address cannot fail an
  // otherwise good import.
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) && trimmed.length <= 200
    ? trimmed
    : "";
}

/** Meta uses ISO; Excel may hand back a Date or a serial number. */
function toIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

/**
 * WhatsApp deep link. Digits only, so a number typed as "+91 93230 63712"
 * still opens. Bare 10-digit numbers are assumed Indian — every departure city
 * on this site is in India.
 */
export function whatsappUrl(phone: string, name: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `As-salamu alaykum ${name || ""}, this is Mufti Travels replying to your enquiry.`.trim(),
  );
  return `https://wa.me/${withCountry}?text=${text}`;
}

/**
 * Turn the sheet's rows into insertable leads.
 *
 * `rows` is whatever the sheet reader produced: one object per row, keyed by
 * the header text. Values arrive as strings except dates, which SheetJS may
 * hand back as Date objects.
 */
export function mapSheetRows(
  rows: Record<string, unknown>[],
  headers: string[],
): ParseResult {
  const column = Object.fromEntries(
    Object.entries(FIELD_CANDIDATES).map(([field, candidates]) => [
      field,
      findHeader(headers, candidates),
    ]),
  ) as Record<keyof typeof FIELD_CANDIDATES, string | null>;

  const mapped = new Set(Object.values(column).filter(Boolean) as string[]);
  const extraHeaders = headers.filter(
    (header) => !mapped.has(header) && !isNoiseHeader(header),
  );

  const seen = new Set<string>();
  const parsed: ParsedMetaLead[] = [];
  let skipped = 0;
  let duplicatesInFile = 0;
  let missingPhone = 0;

  for (const row of rows) {
    const read = (field: keyof typeof FIELD_CANDIDATES) => {
      const header = column[field];
      return header ? String(row[header] ?? "").trim() : "";
    };

    const phone = cleanPhone(read("phone"));
    const name = read("name").slice(0, 120);

    // Nothing can be done with a lead that has neither a number to call nor a
    // name to look up.
    if (!phone && !name) {
      skipped += 1;
      continue;
    }

    const createdAt =
      toIso(column.createdAt ? row[column.createdAt] : null) ??
      new Date().toISOString();

    // Meta's own lead id when the export has one. Falling back to
    // phone|created alone is not enough: an Excel-mangled phone comes through
    // empty, and two such rows sharing a timestamp would collide and silently
    // drop one. Name disambiguates them.
    const externalId = read("externalId");
    const dedupeKey = (externalId || `${phone}|${name}|${createdAt}`).slice(
      0,
      200,
    );

    if (seen.has(dedupeKey)) {
      duplicatesInFile += 1;
      continue;
    }
    seen.add(dedupeKey);
    if (!phone) missingPhone += 1;

    // Keep the row verbatim, stringified, so `raw` is always jsonb-safe.
    // `extra` is the subset worth showing: the lead form's own questions, which
    // is usually where the travel date and package interest actually live.
    // Computed here rather than guessed at display time, because this is the
    // only place that knows which headers were consumed by a mapped field.
    const raw: Record<string, string> = {};
    const extra: Record<string, string> = {};
    for (const header of headers) {
      const value = row[header];
      if (value === undefined || value === null || value === "") continue;
      const text =
        value instanceof Date
          ? value.toISOString()
          : String(value).slice(0, 500);
      raw[header] = text;
      if (!mapped.has(header) && !isNoiseHeader(header)) extra[header] = text;
    }

    parsed.push({
      dedupe_key: dedupeKey,
      name,
      phone,
      email: cleanEmail(read("email")),
      city: read("city").slice(0, 80),
      campaign_name: read("campaign").slice(0, 200),
      adset_name: read("adset").slice(0, 200),
      ad_name: read("ad").slice(0, 200),
      form_name: read("form").slice(0, 200),
      raw,
      extra,
      created_at: createdAt,
    });
  }

  return {
    rows: parsed,
    extraHeaders,
    skipped,
    duplicatesInFile,
    missingPhone,
  };
}

/**
 * Read an uploaded .csv or .xlsx into rows.
 *
 * SheetJS is imported dynamically: it is ~1 MB and only this one screen needs
 * it, so it stays out of the admin bundle until someone picks a file.
 */
export async function readLeadFile(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      rows: [],
      extraHeaders: [],
      skipped: 0,
      duplicatesInFile: 0,
      missingPhone: 0,
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // sheet_to_json infers headers per row; read row 1 directly so a column that
  // is empty in every visible row still counts as a header.
  const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
  })[0];
  const headers = (headerRow ?? [])
    .map((header) => String(header ?? "").trim())
    .filter(Boolean);

  return mapSheetRows(rows, headers);
}
