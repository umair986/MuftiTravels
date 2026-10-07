/**
 * Copy for the departure-city landing pages (/umrah-packages-from-mumbai …).
 *
 * The category pages answer "what is a fixed group"; these answer "Umrah from
 * *my city*" — the query people actually type. The URL reads like the query on
 * purpose, which is why these are top-level routes rather than something under
 * /packages.
 *
 * Nothing here states a price or a duration. Both are read at render time from
 * the city's current packages — every published package whose
 * `departure_city` is this city and whose month is not over (migration 026,
 * docs/monthly-packages.md) — and the FAQs that quote them are built from
 * those, so an edit in the admin can never leave a stale number in the copy or
 * in the FAQ schema. There is deliberately no hardcoded copy to fall back on: a
 * second copy is how this page once quoted a different price from the rest of
 * the site. A city with nothing current shows no price at all.
 *
 * One entry per departure city, built by `cityPage` so every city asks the
 * same questions. Only Mumbai carries the office block and the "visit us"
 * answer — the office is in Bandra East, and a page must not imply a local
 * office where there is none.
 */

import type { TierPriceMap } from "@/app/components/packageData";
import { FIXED_GROUP_INCLUDED_ANSWER, VISA_ANSWER } from "@/lib/categoryLanding";
import { DEPARTURE_CITIES, cityPath, type CityKey } from "@/lib/departures";
import { BUSINESS } from "@/lib/seo";

export type { CityKey } from "@/lib/departures";

export type CityLanding = {
  /** Path of the landing page itself, used for canonical, sitemap and breadcrumbs. */
  path: string;
  city: string;
  /** <title>. Keep under ~60 characters so it is not truncated in results. */
  metaTitle: string;
  /** Given the live starting price, or nothing — in which case the price sentence is dropped. */
  metaDescription: (fromPrice?: string) => string;
  heading: string;
  eyebrow: string;
  intro: string[];
  /** Whether the office block (address, hours, map) belongs on this page. */
  hasOffice: boolean;
  /** `trip` is absent when the city's package is not published. */
  faqs: (trip?: TripFacts) => { question: string; answer: string }[];
};

/** Price cell: `tier` is whatever the price table keys by (a CMS key or a display name). */
export type CheapestPrice = { amount: number; tier: string; room: string };

/** What the FAQs may quote, resolved from the live package. */
export type TripFacts = {
  /** `tier` here is already a display name. */
  price?: CheapestPrice;
  days: number;
  nights: number;
};

/** The lowest price in a tier × room table, and which cell it came from. */
export function cheapestPrice(
  prices: TierPriceMap | Record<string, Record<string, number> | undefined>,
): CheapestPrice | undefined {
  let best: CheapestPrice | undefined;
  for (const [tier, rooms] of Object.entries(prices)) {
    for (const [room, amount] of Object.entries(
      (rooms ?? {}) as Record<string, number | undefined>,
    )) {
      if (typeof amount === "number" && amount > 0 && (!best || amount < best.amount)) {
        best = { amount, tier, room };
      }
    }
  }
  return best;
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const ROOM_SHARING: Record<string, string> = {
  Quint: "five",
  Quad: "four",
  Triple: "three",
  Double: "two",
};

type CityInput = {
  key: CityKey;
  city: string;
  /** Departure airport as pilgrims know it, with its IATA code. */
  airport: string;
  /**
   * Whether the group flies direct to Saudi Arabia from here. Only claimed
   * where it is known to be true: the FAQ schema puts this sentence in front
   * of Google, and a wrong "direct flight" is a promise the business then has
   * to keep or explain.
   */
  direct: boolean;
  hasOffice: boolean;
  /** One line under the heading. */
  eyebrow: string;
  intro: string[];
};


const officeAddress = `${BUSINESS.street}, ${BUSINESS.locality} — ${BUSINESS.postalCode}`;
const phoneSpoken = BUSINESS.phone.replace(/-/g, " ");

function cityPage(input: CityInput): CityLanding {
  const { key, city, airport, direct, hasOffice } = input;
  const others = DEPARTURE_CITIES.filter((other) => other.key !== key).map(
    (other) => other.name,
  );
  const otherCities = `${others.slice(0, -1).join(", ")} and ${others.at(-1)}`;

  return {
    path: cityPath(key),
    city,
    metaTitle: `Umrah Packages from ${city}`,
    metaDescription: (fromPrice) =>
      [
        `Umrah packages from ${city} with ${direct ? "direct flights" : "flights"}, Saudi visa, hotels near the Haram, meals and guided Ziyarat.`,
        fromPrice ? `From ${fromPrice} per person.` : "",
        hasOffice ? "Office in Bandra East." : "",
      ]
        .filter(Boolean)
        .join(" "),
    eyebrow: input.eyebrow,
    heading: `Umrah Packages from ${city}`,
    intro: input.intro,
    hasOffice,
    faqs: (trip) => [
      ...(trip?.price
        ? [
            {
              question: `How much does Umrah cost from ${city}?`,
              answer: `Our ${trip.days}-day fixed-group Umrah from ${city} starts at ${formatRupees(trip.price.amount)} per person, in the ${trip.price.tier} tier with ${ROOM_SHARING[trip.price.room] ?? trip.price.room.toLowerCase()} people sharing a room. The price rises with the hotel tier and with fewer people per room, and moves month to month with flight and hotel rates; the full price table is on the package page. Ramadan and winter departures are priced separately — call or WhatsApp us for the nearest date and today's rate.`,
            },
          ]
        : []),
      {
        question: `What is included in the Umrah package from ${city}?`,
        answer: FIXED_GROUP_INCLUDED_ANSWER,
      },
      {
        question: "Which airport does the group fly from?",
        answer: direct
          ? `${airport}, on a direct flight to Saudi Arabia.`
          : `${airport}. The routing for your group — direct or via a connection — is confirmed with your booking.`,
      },
      ...(trip
        ? [
            {
              question: `How long is the Umrah trip from ${city}?`,
              answer: `The fixed group is ${trip.days} days and ${trip.nights} nights, with stays in both Makkah and Madinah. If you want a longer stay in the Haramain, a land package can be paired with your own flights.`,
            },
          ]
        : []),
      {
        question: `What documents do I need for Umrah from ${city}?`,
        answer: VISA_ANSWER,
      },
      hasOffice
        ? {
            question: `Can I visit your office in ${city}?`,
            answer: `Yes. We are at ${officeAddress}, open Monday to Saturday from 10:00 AM to 8:00 PM, and on Sunday by appointment. Call or WhatsApp ${phoneSpoken} before you come.`,
          }
        : {
            question: `How do I book from ${city}?`,
            answer: `Call or WhatsApp us on ${phoneSpoken} and we will take you through the dates, hotel tiers and documents. Our office is at ${officeAddress}, and you are welcome to visit it if you are in Mumbai.`,
          },
      {
        question: `I live outside ${city}. Can I still book?`,
        answer: `Yes. We also run fixed-group departures from ${otherCities}, and if you are booking your own flights from anywhere else, a land package covers the visa, hotels and transport inside Saudi Arabia.`,
      },
    ],
  };
}

export const CITY_LANDING: Record<CityKey, CityLanding> = {
  mumbai: cityPage({
    key: "mumbai",
    city: "Mumbai",
    airport: "Chhatrapati Shivaji Maharaj International Airport (BOM), Mumbai",
    direct: true,
    hasOffice: true,
    eyebrow: "Departing Mumbai · Office in Bandra East",
    intro: [
      "Mufti Travels is a Mumbai-based Hajj and Umrah operator. Our fixed-group Umrah departs on a direct flight from Mumbai, and the package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Our office is in Bandra East, so you can sit down with us before you book — go through the hotels, the room sharing and the documents in person, and meet the team who will be looking after your group.",
    ],
  }),
  delhi: cityPage({
    key: "delhi",
    city: "Delhi",
    airport: "Indira Gandhi International Airport (DEL), New Delhi",
    direct: true,
    hasOffice: false,
    eyebrow: "Departing Delhi · Direct flight",
    intro: [
      "Our fixed-group Umrah from Delhi departs on a direct flight from Indira Gandhi International Airport, and the package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Delhi and the surrounding region book with us by phone and WhatsApp. We take you through the dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
  lucknow: cityPage({
    key: "lucknow",
    city: "Lucknow",
    airport: "Chaudhary Charan Singh International Airport (LKO), Lucknow",
    direct: true,
    hasOffice: false,
    eyebrow: "Departing Lucknow · Direct flight",
    intro: [
      "Our fixed-group Umrah from Lucknow departs on a direct flight from Chaudhary Charan Singh International Airport, so pilgrims from Lucknow and across Uttar Pradesh do not need to connect through Delhi or Mumbai. The package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Lucknow book with us by phone and WhatsApp. We take you through the dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
  // The three cities below arrived with migration 026. `direct` is false for
  // each until the business confirms the group flies non-stop from there — see
  // the note on CityInput.direct.
  hyderabad: cityPage({
    key: "hyderabad",
    city: "Hyderabad",
    airport: "Rajiv Gandhi International Airport (HYD), Hyderabad",
    direct: false,
    hasOffice: false,
    eyebrow: "Departing Hyderabad",
    intro: [
      "Our fixed-group Umrah from Hyderabad departs from Rajiv Gandhi International Airport, and the package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Hyderabad and across Telangana book with us by phone and WhatsApp. We take you through this month's dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
  bangalore: cityPage({
    key: "bangalore",
    city: "Bangalore",
    airport: "Kempegowda International Airport (BLR), Bengaluru",
    direct: false,
    hasOffice: false,
    eyebrow: "Departing Bangalore",
    intro: [
      "Our fixed-group Umrah from Bangalore departs from Kempegowda International Airport, and the package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Bangalore and across Karnataka book with us by phone and WhatsApp. We take you through this month's dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
  ahmedabad: cityPage({
    key: "ahmedabad",
    city: "Ahmedabad",
    airport: "Sardar Vallabhbhai Patel International Airport (AMD), Ahmedabad",
    direct: false,
    hasOffice: false,
    eyebrow: "Departing Ahmedabad",
    intro: [
      "Our fixed-group Umrah from Ahmedabad departs from Sardar Vallabhbhai Patel International Airport, and the package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Ahmedabad and across Gujarat book with us by phone and WhatsApp. We take you through this month's dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
};
