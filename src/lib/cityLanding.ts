/**
 * Copy for the departure-city landing pages (/umrah-packages-from-mumbai …).
 *
 * The category pages answer "what is a fixed group"; these answer "Umrah from
 * *my city*" — the query people actually type. The URL reads like the query on
 * purpose, which is why these are top-level routes rather than something under
 * /packages.
 *
 * Nothing here states a price or a duration. Both are read from the city's
 * fixed-group package at render time, and the FAQs that quote them are built
 * from it, so an edit in the admin can never leave a stale number in the copy
 * or in the FAQ schema.
 *
 * The package is named by its CMS slug and read from the admin — the same
 * record /packages/umrah-fixed-group lists. There is deliberately no hardcoded
 * copy to fall back on: a second copy is how this page once quoted a different
 * price from the rest of the site. If the record is unpublished, the page
 * simply shows no package card and no price.
 *
 * One entry per departure city, built by `cityPage` so every city asks the
 * same questions. Only Mumbai carries the office block and the "visit us"
 * answer — the office is in Bandra East, and a page must not imply a local
 * office where there is none.
 */

import type { TierPriceMap } from "@/app/components/packageData";
import { FIXED_GROUP_INCLUDED_ANSWER, VISA_ANSWER } from "@/lib/categoryLanding";
import { BUSINESS } from "@/lib/seo";

export type CityKey = "mumbai" | "delhi" | "lucknow";

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
  /** CMS slug of the city's fixed-group package (category Umrah Fixed Group). */
  fixedGroupSlug: string;
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
  hasOffice: boolean;
  /** One line under the heading. */
  eyebrow: string;
  intro: string[];
};

const CITY_NAMES: Record<CityKey, string> = {
  mumbai: "Mumbai",
  delhi: "Delhi",
  lucknow: "Lucknow",
};

const officeAddress = `${BUSINESS.street}, ${BUSINESS.locality} — ${BUSINESS.postalCode}`;
const phoneSpoken = BUSINESS.phone.replace(/-/g, " ");

function cityPage(input: CityInput): CityLanding {
  const { key, city, airport, hasOffice } = input;
  const otherCities = (Object.keys(CITY_NAMES) as CityKey[])
    .filter((other) => other !== key)
    .map((other) => CITY_NAMES[other])
    .join(" and ");

  return {
    path: `/umrah-packages-from-${key}`,
    city,
    metaTitle: `Umrah Packages from ${city}`,
    metaDescription: (fromPrice) =>
      [
        `Umrah packages from ${city} with direct flights, Saudi visa, hotels near the Haram, meals and guided Ziyarat.`,
        fromPrice ? `From ${fromPrice} per person.` : "",
        hasOffice ? "Office in Bandra East." : "",
      ]
        .filter(Boolean)
        .join(" "),
    eyebrow: input.eyebrow,
    heading: `Umrah Packages from ${city}`,
    intro: input.intro,
    fixedGroupSlug: `15-days-regular-umrah-from-${key}`,
    hasOffice,
    faqs: (trip) => [
      ...(trip?.price
        ? [
            {
              question: `How much does Umrah cost from ${city}?`,
              answer: `Our ${trip.days}-day fixed-group Umrah from ${city} starts at ${formatRupees(trip.price.amount)} per person, in the ${trip.price.tier} tier with ${ROOM_SHARING[trip.price.room] ?? trip.price.room.toLowerCase()} people sharing a room. The price rises with the hotel tier and with fewer people per room; the full price table is on the package page.`,
            },
          ]
        : []),
      {
        question: `What is included in the Umrah package from ${city}?`,
        answer: FIXED_GROUP_INCLUDED_ANSWER,
      },
      {
        question: "Which airport does the group fly from?",
        answer: `${airport}, on a direct flight to Saudi Arabia.`,
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
    hasOffice: false,
    eyebrow: "Departing Lucknow · Direct flight",
    intro: [
      "Our fixed-group Umrah from Lucknow departs on a direct flight from Chaudhary Charan Singh International Airport, so pilgrims from Lucknow and across Uttar Pradesh do not need to connect through Delhi or Mumbai. The package covers the Saudi Umrah visa, hotels in Makkah and Madinah, meals, transfers and guided Ziyarat in both cities.",
      "Pilgrims from Lucknow book with us by phone and WhatsApp. We take you through the dates, the hotel tiers and the documents before you commit, and stay on call through the journey.",
    ],
  }),
};
