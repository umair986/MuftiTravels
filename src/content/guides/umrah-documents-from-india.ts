import type { Guide } from "@/lib/guides";

/**
 * Sources were read on 17 September 2026. The vaccine section follows the
 * Saudi Ministry of Health's 1447H (2026) Umrah health requirements; the
 * Ministry of Hajj and Umrah FAQ still carries an older answer saying no
 * vaccination is needed, which is why the article cites the MoH document and
 * not the FAQ on that point. Claims that official pages contradict each other
 * on (e.g. the FAQ's "stay must not exceed thirty days") are left out.
 */

const SOURCES = {
  mohUmrah:
    "https://www.moh.gov.sa/en/HealthAwareness/Pilgrims-Health/Documents/Health-Regulations-Umrah-EN.pdf",
  hajFaq: "https://haj.gov.sa/en/FAQ",
  hajRequirements: "https://haj.gov.sa/en/Umrah/Umrah-Requirements",
  nusuk: "https://umrah.nusuk.sa/",
  spaMultiEntry: "https://www.spa.gov.sa/en/N2637600",
  visitSaudi: "https://visa.visitsaudi.com/",
  saudiEmbassy: "https://saudiembassy.sa/",
  passportSeva: "https://www.passportindia.gov.in/psp/FaqServicesAvailable",
  meaEmigrants: "https://www.mea.gov.in/issues-of-intending-emigrants",
  boi: "https://boi.gov.in/boi/",
  tcs: "https://www.incometaxindia.gov.in/w/tax-collection-at-source-tcs-",
};

export const umrahDocumentsFromIndia: Guide = {
  slug: "umrah-documents-passport-visa-india",
  title: "Umrah from India: Passport, Visa and Immigration Documents",
  metaTitle: "Umrah Documents from India: 2026 Checklist",
  description:
    "What an Indian pilgrim needs for Umrah in 2026 — passport validity, the Saudi Umrah visa and Nusuk permits, the meningitis vaccine, ECR passports, PAN and airport immigration — checked against official Indian and Saudi sources.",
  eyebrow: "Umrah guide · Documents",
  published: "2026-09-17",
  reviewed: "2026-09-17",
  readingMinutes: 7,
  image: {
    src: "/packages/umrah/umrah3.jpeg",
    alt: "Pilgrims in prayer around the Kaaba at Masjid al-Haram at night",
  },
  intro: [
    "Most Umrah trips that go wrong go wrong before the airport — a passport a few weeks short of the validity Saudi Arabia asks for, a vaccination taken too late, or a name spelled one way on the ticket and another on the visa. This guide walks through every document an Indian pilgrim needs, in the order you should sort them out.",
    "Everything here is taken from official Indian and Saudi government sources, linked at the end. Rules do change, so treat those sources as the final word and check them close to your travel date.",
  ],
  sections: [
    {
      id: "passport",
      heading: "1. Your passport",
      blocks: [
        {
          type: "p",
          text: "Your Indian passport is the document everything else is built on. The visa, the flight ticket and your Nusuk registration all copy details from it, so get it right first.",
        },
        {
          type: "list",
          items: [
            "**At least six months of validity.** The [Royal Embassy of Saudi Arabia](" +
              SOURCES.saudiEmbassy +
              ") asks for a passport valid for a minimum of six months. Count from your return date, not your departure date, and leave yourself a margin.",
            "**Renew early if you need to.** [Passport Seva](" +
              SOURCES.passportSeva +
              ") lets you apply for re-issue when validity has expired or is due to expire, and when the pages are used up. Apply online, then attend your appointment at a Passport Seva Kendra with original documents. A Tatkaal (urgent) application is available for eligible applicants at an extra fee.",
            "**Names must match exactly.** Book your flight with your name exactly as it appears on the passport. A mismatch between ticket, visa and passport is an avoidable cause of trouble at check-in.",
            "**Check its condition.** A torn or water-damaged passport can cause problems at check-in or immigration. If yours is damaged, Passport Seva handles that as a re-issue too.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "ECR passport? You can still go for Umrah",
          text:
            "Saudi Arabia is one of the countries for which India requires emigration clearance — but only for people going there to work. The [Ministry of External Affairs](" +
            SOURCES.meaEmigrants +
            ") states that ECR passport holders going to an ECR country for purposes other than employment do not require emigration clearance. Carry your visa and return ticket to show at immigration.",
        },
      ],
    },
    {
      id: "visa",
      heading: "2. The Saudi Umrah visa",
      blocks: [
        {
          type: "p",
          text:
            "The Umrah visa is an electronic visa issued by Saudi Arabia. According to the [Ministry of Hajj and Umrah](" +
            SOURCES.hajFaq +
            "), it can be obtained directly through approved electronic platforms such as [Nusuk](" +
            SOURCES.nusuk +
            "), or through an authorised agent — which is how pilgrims on our packages receive it.",
        },
        {
          type: "list",
          items: [
            "**Length of stay:** the Ministry sets the stay on an Umrah visa at 90 days, and the visa cannot be extended beyond that.",
            "**Not valid for Hajj:** an Umrah visa cannot be extended into the Hajj season.",
            "**When to enter:** you must enter Saudi Arabia within three months of the visa being issued.",
            "**Multiple-entry option:** in July 2026 the Ministry [announced a multiple-entry Umrah visa valid for one year](" +
              SOURCES.spaMultiEntry +
              "), with a combined stay of up to 90 days across all visits. It is not active during the Hajj season.",
            "**Tourist eVisa:** Saudi Arabia's [tourist eVisa](" +
              SOURCES.visitSaudi +
              ") also allows Umrah outside the Hajj season. If you already hold one, tell us before booking.",
          ],
        },
        {
          type: "p",
          text: "For the application you will be asked for a clear scan of your passport's photo page and a recent passport-size photograph. On our packages we handle the visa application for you. When the approved visa arrives, check every detail on it against your passport straight away.",
        },
        {
          type: "callout",
          tone: "info",
          title: "Women travelling without a mahram",
          text:
            "The Ministry of Hajj and Umrah [confirms](" +
            SOURCES.hajFaq +
            ") that women are allowed to perform Umrah without a mahram.",
        },
      ],
    },
    {
      id: "nusuk",
      heading: "3. Nusuk registration and permits",
      blocks: [
        {
          type: "p",
          text:
            "A visa gets you into the country; permits get you into specific places at specific times. Permits are issued through the Nusuk app (or Tawakkalna), and the [Ministry](" +
            SOURCES.hajFaq +
            ") states that booking them is required.",
        },
        {
          type: "list",
          items: [
            "**Register as a visitor.** You can register in Nusuk from outside Saudi Arabia once you hold a valid visa. It asks for your passport number, visa number, date of birth, nationality, mobile number and email.",
            "**Umrah permit.** Book a time slot for your Umrah. Times cannot be edited — to change one, cancel it in the app before the slot starts and book again.",
            "**Rawdah permit.** Praying in Al-Rawdah Al-Sharifah in Madinah needs its own permit, and the Ministry allows one visit every 30 days.",
          ],
        },
        {
          type: "p",
          text: "Our fixed-group packages include the Rawdah permit. Even so, install Nusuk and register before you fly, so you can see your permits on your own phone.",
        },
      ],
    },
    {
      id: "vaccination",
      heading: "4. Vaccination and health",
      blocks: [
        {
          type: "p",
          text:
            "Saudi Arabia's Ministry of Health publishes the health requirements for each Umrah season. For 1447H (2026), its [official document](" +
            SOURCES.mohUmrah +
            ") requires **every Umrah pilgrim, from every country,** to be vaccinated against meningococcal meningitis with a vaccine covering serogroups A, C, Y and W:",
        },
        {
          type: "list",
          items: [
            "a quadrivalent (ACYW) or pentavalent (ACYWX) **conjugate** vaccine taken within the last **5 years**, or",
            "a quadrivalent (ACYW) **polysaccharide** vaccine taken within the last **3 years**,",
            "and in either case at least **10 days before you arrive** in Saudi Arabia.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Keep the certificate — and make sure it names the vaccine",
          text: "Pilgrims from India are not on the list of countries that must show the certificate on arrival, but the vaccination itself is still required, so carry the certificate. The Ministry of Health notes that if a certificate does not state the type of vaccine, it is treated as valid for only 3 years from the date it was given.",
        },
        {
          type: "list",
          items: [
            "**COVID-19:** pilgrims over 65, pregnant women, and people with chronic heart, lung, kidney or neurological disease, hereditary blood disorders, immune deficiency or cancer must show proof of vaccination or immunity — a single dose of an updated 2025–26 vaccine, a completed primary course from 2021–2024, or lab-confirmed recovery during 2025.",
            "**Polio and yellow fever:** the 2026 requirements apply to travellers from specific countries. India is not among them.",
            "**Seasonal flu and routine vaccines:** recommended rather than required. Speak to your doctor, especially if you are older or have a chronic condition.",
            "**Medicines:** carry a note from your doctor describing any chronic condition, and enough medicine for the whole trip in its original packaging.",
          ],
        },
      ],
    },
    {
      id: "india-departure",
      heading: "5. Leaving India: PAN and immigration",
      blocks: [
        {
          type: "list",
          items: [
            "**PAN card.** Indian tax law requires the seller of an overseas tour package to [collect tax at source (TCS)](" +
              SOURCES.tcs +
              ") from the buyer, and the rate is higher when no PAN is given. We will ask for your PAN when you book. Make sure it is linked to your Aadhaar — an inoperative PAN is treated as no PAN. The TCS appears on your invoice and can be claimed against your income tax.",
            "**Immigration at the Indian airport.** The [Bureau of Immigration](" +
              SOURCES.boi +
              ") requires Indian citizens to clear immigration on departure and on return. Keep your passport, printed visa and boarding pass together and ready.",
            "**Customs in Saudi Arabia.** The Ministry of Hajj and Umrah's [requirements page](" +
              SOURCES.hajRequirements +
              ") lists what you may not bring in freely — including cash above SAR 60,000, commercial quantities of gifts, drugs and weapons — and refers to the Zakat, Tax and Customs Authority for the full list.",
          ],
        },
      ],
    },
    {
      id: "checklist",
      heading: "Your document checklist",
      blocks: [
        {
          type: "p",
          text: "Print this or save it to your phone. Carry the originals in your hand luggage and keep photos of each on your phone and with a family member at home.",
        },
        {
          type: "checklist",
          items: [
            "Indian passport with at least six months' validity",
            "Printed copy of your approved Umrah visa",
            "Return flight ticket in your exact passport name",
            "Meningitis (ACYW) vaccination certificate naming the vaccine and date",
            "COVID-19 vaccination proof, if you are over 65, pregnant or have a listed chronic condition",
            "PAN card (linked to Aadhaar), for booking",
            "Nusuk app installed, registered, with your Umrah and Rawdah permits",
            "Doctor's note and medicines in original packaging, if you take regular medication",
            "Hotel and group contact details, and your operator's phone number",
          ],
        },
      ],
    },
  ],
  faqs: [
    {
      question: "How much passport validity do I need for Umrah from India?",
      answer:
        "At least six months. Count it from your return date and leave a margin; if your passport is close to expiry, apply for a re-issue through Passport Seva before booking.",
    },
    {
      question: "Can I go for Umrah on an ECR passport?",
      answer:
        "Yes. India's Ministry of External Affairs states that ECR passport holders travelling to an ECR country such as Saudi Arabia for purposes other than employment do not need emigration clearance.",
    },
    {
      question: "Is the meningitis vaccine compulsory for Umrah?",
      answer:
        "Yes. Saudi Arabia's Ministry of Health requires all Umrah pilgrims for 1447H (2026) to have a meningococcal ACYW vaccine — conjugate within the last 5 years or polysaccharide within the last 3 years — taken at least 10 days before arrival.",
    },
    {
      question: "How long can I stay in Saudi Arabia on an Umrah visa?",
      answer:
        "The Ministry of Hajj and Umrah sets the stay at 90 days, and it cannot be extended beyond that or into the Hajj season.",
    },
    {
      question: "Can a woman perform Umrah without a mahram?",
      answer:
        "Yes. The Saudi Ministry of Hajj and Umrah confirms that women are allowed to perform Umrah without a mahram.",
    },
    {
      question: "Why does the tour operator need my PAN?",
      answer:
        "Indian tax law requires the seller of an overseas tour package to collect tax at source from the buyer, at a higher rate if no PAN is given. The amount collected can be claimed against your income tax.",
    },
  ],
  sources: [
    {
      label: "Ministry of Health, Saudi Arabia — Health requirements for Umrah, 1447H (2026)",
      url: SOURCES.mohUmrah,
    },
    { label: "Ministry of Hajj and Umrah, Saudi Arabia — FAQ", url: SOURCES.hajFaq },
    {
      label: "Ministry of Hajj and Umrah — Umrah requirements (prohibited items)",
      url: SOURCES.hajRequirements,
    },
    {
      label: "Saudi Press Agency — Multiple-entry Umrah visa valid for one year (July 2026)",
      url: SOURCES.spaMultiEntry,
    },
    { label: "Nusuk Umrah platform", url: SOURCES.nusuk },
    { label: "Visit Saudi — Official Saudi eVisa", url: SOURCES.visitSaudi },
    { label: "Royal Embassy of Saudi Arabia", url: SOURCES.saudiEmbassy },
    { label: "Passport Seva, Government of India — Services FAQ", url: SOURCES.passportSeva },
    {
      label: "Ministry of External Affairs, India — FAQ on issues of intending emigrants",
      url: SOURCES.meaEmigrants,
    },
    { label: "Bureau of Immigration, India", url: SOURCES.boi },
    {
      label: "Income Tax Department, India — Tax Collection at Source",
      url: SOURCES.tcs,
    },
  ],
};
