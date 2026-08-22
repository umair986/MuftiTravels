/**
 * Copy for the category landing pages (/packages/hajj, /packages/ziyarat …).
 *
 * These pages exist to rank. A search for "hajj packages from india" wants a
 * page about Hajj packages, not a mixed catalog — so each category gets its
 * own URL, title, heading and real prose.
 *
 * Everything here is editorial and safe to reword. Nothing states a price or a
 * date: those come from the live catalog, which is the only thing that knows
 * them.
 */

import type { CategoryType } from "@/app/components/packageData";

export type CategoryLanding = {
  /** <title>. Keep under ~60 characters so it is not truncated in results. */
  metaTitle: string;
  metaDescription: string;
  /** The visible <h1>. */
  heading: string;
  /** One-line kicker above the heading. */
  eyebrow: string;
  /** Two or three paragraphs of real copy under the heading. */
  intro: string[];
  faqs: { question: string; answer: string }[];
};

const VISA_ANSWER =
  "An Indian passport valid for at least six months with a minimum of two blank pages, a PAN card linked to your Aadhaar number, and influenza and meningitis vaccination taken at least ten days before travel. We handle the Saudi visa application itself.";

export const CATEGORY_LANDING: Record<CategoryType, CategoryLanding> = {
  "Umrah Fixed Group": {
    metaTitle: "Umrah Fixed Group Packages from India",
    metaDescription:
      "Fixed-group Umrah packages from Mumbai, Delhi and Lucknow — flights, Saudi visa, hotels near the Haram, meals and guided Ziyarat in one price.",
    eyebrow: "Air + Hotel + Visa",
    heading: "Umrah Fixed Group Packages from India",
    intro: [
      "A fixed-group Umrah is the simplest way to perform Umrah from India: you travel with a group on set departure dates, and flights, the Saudi Umrah visa, hotels in Makkah and Madinah, ground transport and meals are arranged as one package.",
      "Our fixed groups depart from Mumbai, Delhi and Lucknow, with a Mufti Travels representative accompanying the group and local staff on the ground in both cities. Ziyarat in Makkah and Madinah is included, along with the Rowda permit.",
    ],
    faqs: [
      {
        question: "What is included in a fixed group Umrah package?",
        answer:
          "Return economy flights, the Saudi Umrah visa and insurance, hotel stays in Makkah and Madinah, breakfast, lunch and dinner, airport pickup and drop, round-trip transfers, local Ziyarat in both cities on a sharing basis, the Rowda permit and 24/7 support.",
      },
      {
        question: "What documents do I need for Umrah from India?",
        answer: VISA_ANSWER,
      },
      {
        question: "Which cities do you operate departures from?",
        answer:
          "Mumbai, Delhi and Lucknow. If you are travelling from another city, we can arrange a connecting sector or a land package that starts in Saudi Arabia.",
      },
      {
        question: "How far are the hotels from the Haram?",
        answer:
          "Hotel distance varies by tier — the higher tiers are closer to the Haram. The exact hotel and walking distance for each tier is listed on the individual package page.",
      },
    ],
  },

  "Umrah Land Package": {
    metaTitle: "Umrah Land Packages — Hotel, Visa & Transport",
    metaDescription:
      "Umrah land packages without flights: Saudi visa, Makkah and Madinah hotels, transfers and ground support. For pilgrims booking their own airfare.",
    eyebrow: "Ground arrangements only",
    heading: "Umrah Land Packages",
    intro: [
      "A land package covers everything on the ground in Saudi Arabia — the Umrah visa, hotel stays in Makkah and Madinah, transfers between the cities and local support — while you book your own flights.",
      "This suits pilgrims who hold airline miles, are travelling on a different date to our fixed groups, or are already in the Gulf. Longer stays of 25 and 30 days are available for those who want extended time in the Haramain.",
    ],
    faqs: [
      {
        question: "What is the difference between a land package and a fixed group?",
        answer:
          "A land package covers only the arrangements inside Saudi Arabia — visa, hotels and transport. A fixed group adds return flights from India and a set departure date with a group leader.",
      },
      {
        question: "Can you book my flights separately?",
        answer:
          "Yes. Flight tickets can be added at approximately INR 36,500, though the final fare depends on the price at the time of issuance. Speak to us before booking your own so the dates match your visa and hotel stay.",
      },
      {
        question: "What documents do I need for Umrah from India?",
        answer: VISA_ANSWER,
      },
    ],
  },

  Ziyarat: {
    metaTitle: "Umrah with Ziyarat Tour Packages from India",
    metaDescription:
      "Combine Umrah with a guided Ziyarat journey — Makkah, Madinah and heritage sites, with visas, hotels and transport arranged end to end.",
    eyebrow: "Umrah + heritage journey",
    heading: "Umrah & Ziyarat Tour Packages",
    intro: [
      "Ziyarat packages combine Umrah with guided visits to the sites of Islamic heritage — Taif and Badar around Makkah, the historic mosques and battlefields of Madinah, and, on our combination tours, destinations further afield.",
      "Every Ziyarat is guided and travels on a sharing basis, so you are accompanied by someone who can explain what you are standing in front of rather than simply driving you to it.",
    ],
    faqs: [
      {
        question: "Which Ziyarat sites are included?",
        answer:
          "Local Ziyarat in Makkah and Madinah is included in every package, along with Taif and Badar on a sharing basis. Combination tours add their own itinerary, listed on the package page.",
      },
      {
        question: "Do combination tours need a second visa?",
        answer:
          "Yes — a tour that includes Turkey or the UAE needs that country's visa in addition to the Saudi Umrah visa. Both are arranged as part of the package.",
      },
      {
        question: "What documents do I need?",
        answer: VISA_ANSWER,
      },
    ],
  },

  Hajj: {
    // No brand suffix here — the root layout's title template appends it.
    metaTitle: "Hajj Packages from India",
    metaDescription:
      "Hajj packages from India with Mina tent categories, Azizia accommodation, Mashaer train options and Qurbani — arranged by a MoFA authorized operator.",
    eyebrow: "The fifth pillar",
    heading: "Hajj Packages from India",
    intro: [
      "Hajj is arranged very differently to Umrah. Seats are limited, the itinerary is fixed by the rites themselves, and the details that separate one package from another are specific: the Mina tent category, whether Azizia accommodation is included and for how many nights, the Maktab allocation, Mashaer train access and Qurbani.",
      "Every package below lists those details plainly, so two prices can be compared for what they actually differ on. Because seats are allocated in advance, Hajj enquiries are best made early — well before the season.",
    ],
    faqs: [
      {
        question: "What is the difference between a shorter and a longer Hajj package?",
        answer:
          "A shorter package covers the days of Hajj with a compressed stay before or after, and a longer package adds time in Makkah and Madinah around the rites. The longer package costs more but leaves room for worship outside the days of Hajj themselves.",
      },
      {
        question: "What does the Mina tent category mean?",
        answer:
          "Tents in Mina are graded by location and facilities, and the grade is usually what separates two Hajj prices. Category A is closest to the Jamarat with the most space; the category for each package is listed on its page.",
      },
      {
        question: "How early should I book Hajj?",
        answer:
          "As early as you can. Seats are allocated in advance and the good Mina categories go first. Speak to us as soon as you have decided on the year rather than waiting for the season to approach.",
      },
      {
        question: "Do you handle the Hajj quota or private route?",
        answer:
          "The registration route is listed on each package. Tell us which route you are applying through when you enquire and we will confirm what is available.",
      },
    ],
  },

  Ramzan: {
    metaTitle: "Ramadan Umrah Packages from India",
    metaDescription:
      "Ramadan Umrah packages — first ashra, last ashra and full-month stays, with Laylatul Qadr nights, Itikaf arrangements and suhoor and iftar included.",
    eyebrow: "Umrah in the blessed month",
    heading: "Ramadan Umrah Packages",
    intro: [
      "Umrah in Ramadan is the most sought-after time of the year, and the most tightly booked. Packages are built around which portion of the month you want: the first ashra, the last ashra with its odd nights, or the full month.",
      "Each package states which of the Laylatul Qadr nights fall inside your stay, whether Itikaf is arranged, and whether suhoor and iftar are included. Hotels near the Haram sell out months in advance in Ramadan, so early booking is the difference between walking to the Haram and travelling to it.",
    ],
    faqs: [
      {
        question: "Which part of Ramadan should I travel in?",
        answer:
          "The last ashra carries the odd nights on which Laylatul Qadr is sought, and is the busiest and most expensive. The first ashra is calmer and costs less. Full-month packages cover both.",
      },
      {
        question: "Is Itikaf arranged?",
        answer:
          "On packages where it is offered, yes — the package page states it explicitly. Itikaf needs a hotel within reach of the Haram, so it is tied to which package you choose.",
      },
      {
        question: "How early should I book Ramadan Umrah?",
        answer:
          "Several months ahead. Haram-adjacent hotel inventory for Ramadan is committed long before the month begins, and late bookings usually mean a longer walk or a higher price.",
      },
      {
        question: "Are dates confirmed before the moon is sighted?",
        answer:
          "Package dates are planned against the expected calendar and confirmed once the moon is sighted. Any shift is communicated to everyone booked on that departure.",
      },
    ],
  },
};
