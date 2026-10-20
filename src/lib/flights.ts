/**
 * Flight legs and the baggage allowance, as a quotation or an invoice states
 * them. Migration 031.
 *
 * Shared by both documents and imported by neither the catalogue nor Supabase,
 * so it stays pure and testable — and so the Decision 5 grep in CLAUDE.md has
 * nothing new to match. A leg is a SNAPSHOT of what the customer was told, for
 * the same reason the hotel on a quotation is text rather than a join
 * (Decision 1 of docs/quotations.md): a schedule change in November must not
 * restate an offer made in April.
 *
 * The business receives these as a block pasted from the airline or a
 * ticketing agent:
 *
 *   Saudi Airline
 *   SV 771  BOM-JED 26Dec 11:00 - 14:15
 *   SV 770 JED - BOM 09Jan 2:10 - 09:25
 *   Check in Baggage 20Kg x 2pc . Cabin Bag  07Kg x 1pc
 *
 * The date is picked on a calendar and stored as YYYY-MM-DD, like every other
 * date in the admin. "26Dec" carries no year, so reading a paste has to supply
 * one — see inferLegDate, which takes the first 26 December on or after the leg
 * before it. A date the reader cannot make sense of is kept as the text it was,
 * and the PDF prints that text rather than nothing (formatLegDate).
 *
 * And very often there are no flights at all yet — "we'll confirm the ticket
 * next week" is the normal state of a quotation. Empty is the default
 * everywhere, and every block that prints one is conditional on there being
 * something to print.
 */

export type FlightLeg = {
  /** "Saudi Airline". Per leg, because a return on another carrier is real. */
  airline: string;
  /** "SV 771". */
  flight_no: string;
  /** IATA codes as given, "BOM" and "JED". Upper-cased, never validated. */
  from: string;
  to: string;
  /**
   * "2026-12-26", from the calendar. A value the paste reader could not turn
   * into a date stays free text ("26Dec"); formatLegDate prints either.
   */
  date: string;
  /** "11:00". */
  departs: string;
  /** "14:15". Arrival may be the next day; the agent says so in the text if so. */
  arrives: string;
};

/** Field caps, matching the CHECK in migration 031. */
export const FLIGHT_FIELD_MAX = {
  airline: 80,
  flight_no: 20,
  from: 40,
  to: 40,
  date: 40,
  departs: 20,
  arrives: 20,
} as const;

/** More than this is a pasted itinerary for a whole group, not a booking. */
export const MAX_FLIGHT_LEGS = 8;

/**
 * The baggage allowance — once per document, not per leg. A ticket states one
 * allowance for the booking, and printing it under every leg says the same
 * thing four times. Null is "not stated", which prints nothing.
 */
export type Baggage = {
  checkin_kg: number | null;
  checkin_pieces: number | null;
  cabin_kg: number | null;
  cabin_pieces: number | null;
};

export const EMPTY_BAGGAGE: Baggage = {
  checkin_kg: null,
  checkin_pieces: null,
  cabin_kg: null,
  cabin_pieces: null,
};

export function blankFlightLeg(airline = ""): FlightLeg {
  return {
    airline,
    flight_no: "",
    from: "",
    to: "",
    date: "",
    departs: "",
    arrives: "",
  };
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (value: string) => ISO_DATE.test((value ?? "").trim());

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today on this device, as YYYY-MM-DD. Only ever a floor for guessing a year. */
function localToday(): string {
  const now = new Date();
  return isoOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** A real calendar date, so "31 Feb" is rejected rather than rolled into March. */
function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * A pasted leg date as YYYY-MM-DD, or "" when it cannot be read.
 *
 * Reads "26Dec", "26 Dec", "26-Dec-26", "26 December 2026", "26/12/2026" and
 * "26.12.2026". Day first throughout: the business and the agents writing
 * these are in India.
 *
 * With no year, it is the first one that puts the date ON OR AFTER
 * `onOrAfter` — today for the first leg, the previous leg for the rest. So a
 * December departure pasted in October lands this year, and a return on
 * "09Jan" after it lands the year after: the reason the return is read against
 * the outbound rather than against today.
 */
export function inferLegDate(text: string, onOrAfter: string): string {
  const raw = (text ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (ISO_DATE.test(raw)) return raw;

  let day: number;
  let month: number;
  let year: number | null = null;

  const named =
    /^(\d{1,2})\s*[-/ .]?\s*([a-z]{3,9})\.?(?:\s*[-/ ,.]?\s*(\d{2,4}))?$/.exec(raw);
  const numeric = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(raw);

  if (named) {
    const index = MONTHS.indexOf(named[2].slice(0, 3));
    if (index < 0) return "";
    day = Number(named[1]);
    month = index + 1;
    if (named[3]) year = Number(named[3]);
  } else if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    if (numeric[3]) year = Number(numeric[3]);
  } else {
    return "";
  }

  if (year !== null) {
    if (year < 100) year += 2000;
    return validDate(year, month, day) ? isoOf(year, month, day) : "";
  }

  const floor = ISO_DATE.test(onOrAfter) ? onOrAfter : localToday();
  const start = Number(floor.slice(0, 4));
  for (let candidate = start; candidate <= start + 4; candidate += 1) {
    if (!validDate(candidate, month, day)) continue;
    const iso = isoOf(candidate, month, day);
    if (iso >= floor) return iso;
  }
  return "";
}

/**
 * "26 Dec 2026" for a calendar date; anything else exactly as it was typed.
 * Built by hand rather than with toLocaleDateString so the PDF, rendered in a
 * browser, does not change with the viewer's locale.
 */
export function formatLegDate(date: string): string {
  const value = (date ?? "").trim();
  if (!ISO_DATE.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const name = MONTHS[month - 1];
  if (!name) return value;
  return `${String(day).padStart(2, "0")} ${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

/* -------------------------------------------------------------------------- */
/* Printing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * "BOM - JED" and "11:00 - 14:15". Empty parts are skipped rather than printed
 * as dashes, because a leg with only a flight number is a real answer ("SV 771,
 * times to follow").
 */
export function flightRoute(leg: Partial<FlightLeg>): string {
  const from = leg.from?.trim() ?? "";
  const to = leg.to?.trim() ?? "";
  return from && to ? `${from} - ${to}` : from || to;
}

export function flightTimes(leg: Partial<FlightLeg>): string {
  const departs = leg.departs?.trim() ?? "";
  const arrives = leg.arrives?.trim() ?? "";
  return departs && arrives ? `${departs} - ${arrives}` : departs || arrives;
}

function allowance(kg: number | null, pieces: number | null): string {
  const weight = kg ? `${kg} kg` : "";
  const count = pieces ? `${pieces} pc` : "";
  return weight && count ? `${weight} × ${count}` : weight || count;
}

/**
 * The allowance phrases the PDF prints, each only when stated:
 * "Check-in 20 kg × 2 pc" and "Cabin 7 kg × 1 pc".
 */
export function baggageLines(baggage: Baggage): string[] {
  const checkin = allowance(baggage.checkin_kg, baggage.checkin_pieces);
  const cabin = allowance(baggage.cabin_kg, baggage.cabin_pieces);
  return [
    checkin ? `Check-in ${checkin}` : "",
    cabin ? `Cabin ${cabin}` : "",
  ].filter(Boolean);
}

export function hasBaggage(baggage: Baggage): boolean {
  return Object.values(baggage).some((value) => value !== null);
}

/* -------------------------------------------------------------------------- */
/* Cleaning what came back from the database                                  */
/* -------------------------------------------------------------------------- */

/**
 * The legs worth storing or printing.
 *
 * Accepts whatever came back from the database — including `undefined`, which
 * is what a row read before migration 031 is applied has in this column — and
 * trims, caps and drops legs with nothing in them. An empty leg left in the
 * array would print as a ruled row of nothing.
 */
export function cleanFlights(value: unknown): FlightLeg[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (leg): leg is Partial<FlightLeg> => Boolean(leg) && typeof leg === "object",
    )
    .map((leg) => {
      const field = (key: keyof FlightLeg) =>
        String(leg[key] ?? "")
          .trim()
          .slice(0, FLIGHT_FIELD_MAX[key]);
      return {
        airline: field("airline"),
        flight_no: field("flight_no"),
        from: field("from").toUpperCase(),
        to: field("to").toUpperCase(),
        date: field("date"),
        departs: field("departs"),
        arrives: field("arrives"),
      };
    })
    .filter((leg) => leg.flight_no || leg.from || leg.to || leg.date)
    .slice(0, MAX_FLIGHT_LEGS);
}

function cleanCount(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) && number > 0 ? Math.min(number, max) : null;
}

/**
 * Whatever came back from the database, as a Baggage. A pre-031 row has no
 * key at all, which reads as nothing stated. The caps match migration 031.
 */
export function cleanBaggage(value: unknown): Baggage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_BAGGAGE };
  }
  const record = value as Record<string, unknown>;
  return {
    checkin_kg: cleanCount(record.checkin_kg, 99),
    checkin_pieces: cleanCount(record.checkin_pieces, 9),
    cabin_kg: cleanCount(record.cabin_kg, 99),
    cabin_pieces: cleanCount(record.cabin_pieces, 9),
  };
}

/* -------------------------------------------------------------------------- */
/* Reading a paste                                                            */
/* -------------------------------------------------------------------------- */

/**
 * "SV 771  BOM-JED 26Dec 11:00 - 14:15" — the leg line the business is sent.
 *
 * Two-character carrier code (letters or a digit, "6E" is IndiGo), the number,
 * then two three-letter airports joined by a dash, an arrow or "to". The rest
 * is the date and the times, in that order.
 */
const LEG_LINE =
  /^\s*([A-Z0-9]{2})\s*-?\s*(\d{1,4}[A-Z]?)\s+([A-Z]{3})\s*(?:-|–|—|>|\/|to)\s*([A-Z]{3})\b\s*(.*)$/i;

/**
 * A clock time, with or without a leading zero or an AM/PM. Colon only: a dot
 * would read the "26.12" of a dotted date as twenty-six minutes past midnight.
 */
const TIME = /\b(\d{1,2}):(\d{2})(\s*[AP]\.?M\.?)?/gi;

/** A pasted line that is about baggage, not the name of an airline. */
const BAGGAGE_LINE = /\b(?:baggage|luggage|bags?|cabin)\b/i;

function normaliseTime(hours: string, minutes: string, suffix = ""): string {
  const meridiem = suffix.replace(/[\s.]/g, "").toUpperCase();
  return `${hours.padStart(2, "0")}:${minutes}${meridiem ? ` ${meridiem}` : ""}`;
}

/**
 * "Check in Baggage 20Kg x 2pc . Cabin Bag  07Kg x 1pc" as a Baggage.
 *
 * Split where "cabin" or "hand" starts, and each half read for a weight and a
 * piece count. A half that names neither is check-in, because that is what an
 * unqualified "Baggage 30Kg" means on a ticket.
 */
export function parseBaggageText(text: string): Baggage {
  const result = { ...EMPTY_BAGGAGE };
  const parts = (text ?? "").split(/(?=\b(?:cabin|hand)\b)/i);
  for (const part of parts) {
    const kg = /(\d{1,3})\s*kgs?\b/i.exec(part);
    const pieces = /(\d{1,2})\s*(?:pcs?|pieces?)\b/i.exec(part);
    if (!kg && !pieces) continue;
    if (/\b(?:cabin|hand)\b/i.test(part)) {
      result.cabin_kg = cleanCount(kg?.[1], 99);
      result.cabin_pieces = cleanCount(pieces?.[1], 9);
    } else {
      result.checkin_kg = cleanCount(kg?.[1], 99);
      result.checkin_pieces = cleanCount(pieces?.[1], 9);
    }
  }
  return result;
}

/**
 * Read a pasted block of flight details into legs and a baggage allowance.
 *
 * A line that reads as a leg becomes one. A line about baggage becomes the
 * allowance. Any other non-empty line is taken to name the airline for the
 * legs under it — which is how the block arrives, a carrier name and then its
 * flights — so "Saudi Airline" on line one applies to both legs, and a second
 * carrier named halfway down applies from there. Reading baggage first is what
 * stops "Check in Baggage 20Kg" becoming the airline of the legs after it.
 *
 * Dates come back as YYYY-MM-DD where they can be read (inferLegDate, from
 * `today` for the first leg and from the previous leg after that), and as the
 * raw text where they cannot — the editor then asks for the date to be picked.
 *
 * Returns only what it could read. A block with no recognisable leg and no
 * baggage returns both empty, and the editor says so and leaves the text where
 * it was rather than storing a guess: a wrong departure time on a document is
 * worse than a blank one the admin fills in by hand.
 */
export function parseFlightPaste(
  text: string,
  today: string = localToday(),
): { legs: FlightLeg[]; baggage: Baggage } {
  const legs: FlightLeg[] = [];
  let baggage: Baggage = { ...EMPTY_BAGGAGE };
  let airline = "";
  let floor = today;

  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const match = LEG_LINE.exec(line);
    if (!match && BAGGAGE_LINE.test(line)) {
      const read = parseBaggageText(line);
      if (hasBaggage(read)) baggage = read;
      continue;
    }
    if (!match) {
      // A header line. Stray punctuation from a WhatsApp forward is dropped.
      airline = line
        .replace(/^[*_\-•\s]+|[*_\-:\s]+$/g, "")
        .slice(0, FLIGHT_FIELD_MAX.airline);
      continue;
    }

    const [, carrier, number, from, to, rest] = match;
    const times = [...rest.matchAll(TIME)];
    const firstTime = times[0]?.index ?? rest.length;
    const rawDate = rest
      .slice(0, firstTime)
      .replace(/^[\s,\-–|·]+|[\s,\-–|·]+$/g, "");
    const date = inferLegDate(rawDate, floor) || rawDate;
    if (ISO_DATE.test(date)) floor = date;

    legs.push({
      airline,
      flight_no: `${carrier.toUpperCase()} ${number.toUpperCase()}`,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      date: date.slice(0, FLIGHT_FIELD_MAX.date),
      departs: times[0] ? normaliseTime(times[0][1], times[0][2], times[0][3]) : "",
      arrives: times[1] ? normaliseTime(times[1][1], times[1][2], times[1][3]) : "",
    });
  }

  return { legs: cleanFlights(legs), baggage };
}

/** The legs alone, for callers with no use for the baggage. */
export function parseFlightText(text: string, today?: string): FlightLeg[] {
  return parseFlightPaste(text, today).legs;
}
