import type { Guide } from "@/lib/guides";

/**
 * Sources were read on 17 September 2026. The rites follow the Nusuk "Umrah
 * Journey" page (the Ministry of Hajj and Umrah's official platform); the
 * miqat rules follow the Ministry's own Miqaats page, because the Journey page
 * does not cover them. The copy is written in our own words, not lifted from
 * either page.
 *
 * Deliberately left out:
 * - A list of the prohibitions of Ihram. None of the official pages read for
 *   this article sets them out, and a list of religious rulings is not
 *   something to write from memory.
 * - Nusuk's airport distances other than Jeddah–Makkah: the same page places
 *   Prince Mohammed bin Abdulaziz Airport under the wrong name and at 107 km
 *   from Makkah, so its figures were not repeated.
 * - Nusuk's SAR–USD rate, which is not what an Indian pilgrim needs and dates.
 * - Nusuk describes the Sa'i as "three and a half laps"; that is written here
 *   as the seven one-way legs it amounts to, which is how pilgrims count it.
 */

const SOURCES = {
  journey: "https://umrah.nusuk.sa/Journey",
  navigating: "https://umrah.nusuk.sa/nusuk/navigating",
  makkahMadinah: "https://umrah.nusuk.sa/MakkahAndMadinah",
  nusukFaq: "https://umrah.nusuk.sa/FAQ",
  miqaats: "https://haj.gov.sa/en/Umrah/Miqaats",
  thingsToRemember: "https://haj.gov.sa/en/Umrah/Things-To-Remember",
};

const DOCUMENTS_GUIDE = "/guides/umrah-documents-passport-visa-india";

export const howToPerformUmrah: Guide = {
  slug: "how-to-perform-umrah-step-by-step",
  title: "How to Perform Umrah: A Step-by-Step Guide",
  metaTitle: "How to Perform Umrah: Step-by-Step Guide",
  description:
    "The four rites of Umrah — Ihram, Tawaf, Sa'i and cutting the hair — explained step by step, with the miqat rules for pilgrims flying from India, the Sunnah acts, and practical tips for Makkah, based on Saudi Arabia's official Nusuk platform.",
  eyebrow: "Umrah guide · Rituals",
  published: "2026-09-17",
  reviewed: "2026-09-17",
  readingMinutes: 8,
  image: {
    src: "/packages/umrah/umrah1.jpeg",
    alt: "Pilgrims in Ihram at the Kaaba in Masjid al-Haram at dusk",
  },
  intro: [
    "Umrah is often called the lesser pilgrimage, but for most pilgrims it is the journey of a lifetime. Unlike Hajj, it can be performed at any time of the year outside the Hajj period, and the rites themselves take only a few hours. Knowing them well before you land lets you give those hours your full attention instead of worrying about what comes next.",
    "This guide walks through the four rites in order, the way Saudi Arabia's official [Nusuk platform](" +
      SOURCES.journey +
      ") sets them out, followed by the Sunnah acts and practical information for your time in the Kingdom. It covers the rites only; for passports, visas and vaccines, read our [Umrah documents guide](" +
      DOCUMENTS_GUIDE +
      ").",
  ],
  sections: [
    {
      id: "overview",
      heading: "Umrah at a glance",
      blocks: [
        {
          type: "p",
          text:
            "Nusuk describes Umrah as a journey of faith, humility and devotion: a chance to answer Allah's call, seek His forgiveness and return home spiritually renewed, standing alongside Muslims from every background in the sacred precincts of Makkah. The rites are performed in this order:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Ihram** — make the intention, recite the Talbiyah and put on the Ihram garments.",
            "**Tawaf** — walk seven rounds around the Kaaba.",
            "**Sa'i** — walk seven times between Safa and Marwah.",
            "**Halq or Taqsir** — shave or shorten the hair, which completes the Umrah.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Sincerity matters as much as the steps",
          text:
            "Nusuk's advice is to approach every step with sincerity, humility and a clear sense of purpose. Umrah is not only a physical journey. Learn the steps before you go, so that in Makkah your mind is free for worship.",
        },
      ],
    },
    {
      id: "ihram",
      heading: "Step 1: Ihram and the miqat",
      blocks: [
        {
          type: "p",
          text:
            "Umrah begins with a sincere intention to enter the state of Ihram and perform its rites, followed by the **Talbiyah** and putting on the Ihram garments. Ihram must be entered at, or before, the **miqat**: the boundary a pilgrim may not cross on the way to Makkah without being in Ihram.",
        },
        {
          type: "p",
          text:
            "The Ministry of Hajj and Umrah [lists the miqats](" +
            SOURCES.miqaats +
            ") set by the Prophet (peace be upon him): **Dhul-Hulaifah** for the people of Madinah, **Al-Juhfah** for the people of Ash-Sham, **Qarn Al-Manazil** for the people of Najd and **Yalamlam** for the people of Yemen. Each applies to the people of that region and to anyone else who passes it on the way.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Flying to Jeddah? Enter Ihram before you land",
          text:
            "The Ministry states that pilgrims arriving by air must not pass the miqat, or the point in the sky parallel to it, without being in Ihram, and that **Jeddah's King Abdulaziz International Airport is neither a miqat nor a place to enter Ihram.** Anyone who passes the miqat without Ihram must go back to it; anyone who enters Ihram after passing it owes a fidyah (compensation). On our packages from India, we tell you before the flight when and where to change, and the cabin crew usually announce when the aircraft nears the miqat.",
        },
        {
          type: "list",
          items: [
            "**Coming from Madinah first?** Pilgrims who start their trip in Madinah enter Ihram at Dhul-Hulaifah on the road to Makkah.",
            "**Already in Makkah?** People staying in Makkah go outside the sacred boundary to enter Ihram for another Umrah. Nusuk names [Masjid Aisha at Al-Tan'im](" +
              SOURCES.makkahMadinah +
              ") — where Aisha (may Allah be pleased with her) entered Ihram after the Farewell Pilgrimage — as one of the closest such points, and Al-Ji'ranah to the north-east as another.",
          ],
        },
      ],
    },
    {
      id: "tawaf",
      heading: "Step 2: Tawaf around the Kaaba",
      blocks: [
        {
          type: "p",
          text:
            "Tawaf is walking around the Kaaba — the Noble House — in worship of its Lord, drawing closer to Him in the way He has prescribed. [Nusuk](" +
            SOURCES.journey +
            ") describes it like this:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Enter the **mataf** (the open area around the Kaaba) and go to the line of the **Black Stone**, with the Kaaba on your left.",
            "When you are in line with the Black Stone, raise your hand and say **\"Allahu Akbar\"**.",
            "Walk around the Kaaba **anticlockwise**.",
            "Make du'a and remember Allah as you walk. There is no fixed wording; pray in whatever language comes from the heart.",
            "When you reach the Black Stone again, you have completed one round. Raise your hand and say \"Allahu Akbar\" again to begin the next.",
            "Carry on in the same way until you have completed **seven rounds**.",
          ],
        },
        {
          type: "p",
          text: "After the seventh round, it is Sunnah to pray two rak'ahs behind Maqam Ibrahim (the Station of Ibrahim) — see the Sunnah acts below. If the area directly behind it is crowded, pray wherever you can find space.",
        },
      ],
    },
    {
      id: "sai",
      heading: "Step 3: Sa'i between Safa and Marwah",
      blocks: [
        {
          type: "p",
          text: "When you finish Tawaf, follow the signs inside Masjid al-Haram to the Mas'a, the gallery where Sa'i is performed. They point you to Safa, where it begins.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Start at Safa.** The hill itself is no longer there, but traces of its rock remain on the ground floor, and signs mark its position on the upper floors.",
            "**Walk towards Marwah.**",
            "**Men jog between the green markers.** Along the way, green lights on the ceiling mark a short stretch. Men walk briskly, close to a run, between them and return to a normal pace after the second. Women walk at a normal pace throughout.",
            "**Reaching Marwah completes one leg.** Turn around and walk back to Safa; that is the second.",
            "**Complete seven legs in all, finishing at Marwah.** Men jog between the green markers on every leg.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Counting the legs",
          text: "Safa to Marwah is one, and Marwah back to Safa is two. Since you start at Safa, odd-numbered legs always end at Marwah, and so does the seventh. Many pilgrims use a counter or a tasbeeh to keep track in the crowd.",
        },
      ],
    },
    {
      id: "hair",
      heading: "Step 4: Shaving or trimming the hair",
      blocks: [
        {
          type: "p",
          text:
            "Once Tawaf and Sa'i are done, cutting the hair completes the Umrah, and everything that was forbidden in Ihram becomes permitted again. [Nusuk](" +
            SOURCES.journey +
            ") sets out:",
        },
        {
          type: "list",
          items: [
            "**Men:** shave the whole head (halq) or shorten the hair all over it (taqsir).",
            "**Women:** cut about **1–2 cm** from the ends of the hair.",
          ],
        },
        {
          type: "p",
          text: "You may wait until you are back at your hotel, and the hair may be cut by yourself or by someone staying with you. Until it is cut, though, you are still in Ihram and its restrictions still apply.",
        },
      ],
    },
    {
      id: "sunnah",
      heading: "Sunnah acts during Umrah",
      blocks: [
        {
          type: "p",
          text: "Alongside the rites, Nusuk lists these Sunnah acts. The first, second and fourth are for men only.",
        },
        {
          type: "list",
          items: [
            "**Uncovering the right shoulder** during Tawaf (idtiba'), with the upper Ihram sheet passed under the right arm.",
            "**Walking briskly with short steps** in the first three rounds of Tawaf (raml).",
            "**Praying two rak'ahs behind Maqam Ibrahim** once Tawaf is complete.",
            "**Jogging between the green markers** during Sa'i.",
          ],
        },
      ],
    },
    {
      id: "in-the-kingdom",
      heading: "Practical tips for your time in the Kingdom",
      blocks: [
        {
          type: "list",
          items: [
            "**Time zone:** Saudi Arabia is on GMT+3, two and a half hours behind India. Prayer times in your hotel and in the Nusuk app are in local time.",
            "**Money:** the currency is the Saudi Riyal (SAR). According to [Nusuk](" +
              SOURCES.navigating +
              "), banks and exchange bureaus at airports and in shopping centres change money, ATMs are easy to find, and Visa, Mastercard and American Express are widely accepted.",
            "**Getting there:** most pilgrims from India land at King Abdulaziz International Airport in Jeddah, about 98 km from Makkah.",
            "**Getting around:** the Haramain High-Speed Railway links Makkah and Madinah. In the cities, government-run buses carry most pilgrims. Cars are allowed but traffic is heavy, and access near the two Holy Mosques can be restricted at busy times.",
            "**Weather:** Nusuk notes that summer temperatures inland reach 27–43°C, while winters are milder. In summer, plan Tawaf for cooler hours where you can.",
            "**Heat:** if someone shows signs of heatstroke, the Ministry of Hajj and Umrah [advises](" +
              SOURCES.thingsToRemember +
              ") moving them somewhere cool and cooling the body with water, especially the head and neck — then get medical help.",
            "**Inside Masjid al-Haram:** the Ministry's guidance is to bring no food or drink other than coffee, dates and water, and no sharp objects.",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Numbers to save before you fly",
          text:
            "Red Crescent (ambulance) **997**, Police **999** or **911**, Civil Defence **998**, Traffic **993**. The Ministry of Hajj and Umrah's unified number is **+966 920002814** (care@haj.gov.sa), and [Nusuk support](" +
            SOURCES.nusukFaq +
            ") is at **+966 920031201** or Support@umrah.nusuk.sa. Save your group leader's number too.",
        },
      ],
    },
    {
      id: "checklist",
      heading: "Your Umrah rites checklist",
      blocks: [
        {
          type: "checklist",
          items: [
            "Ihram garments packed in your hand luggage, and changed into before the miqat",
            "Intention made and Talbiyah recited",
            "Tawaf: seven rounds, starting and ending at the Black Stone",
            "Two rak'ahs behind Maqam Ibrahim",
            "Sa'i: seven legs, starting at Safa and ending at Marwah",
            "Hair shaved or shortened (men), or 1–2 cm cut from the ends (women)",
            "Emergency numbers and your group leader's number saved on your phone",
          ],
        },
      ],
    },
  ],
  faqs: [
    {
      question: "What are the steps of Umrah?",
      answer:
        "There are four: entering Ihram with the intention and the Talbiyah, Tawaf (seven rounds around the Kaaba), Sa'i (seven legs between Safa and Marwah), and shaving or shortening the hair, which completes the Umrah.",
    },
    {
      question: "Can I enter Ihram at Jeddah airport?",
      answer:
        "No. Saudi Arabia's Ministry of Hajj and Umrah states that King Abdulaziz International Airport in Jeddah is neither a miqat nor a place to enter Ihram. Pilgrims flying in must be in Ihram before the aircraft passes the miqat or the point parallel to it.",
    },
    {
      question: "How long does it take to perform Umrah?",
      answer:
        "There is no fixed time. The rites themselves usually take a few hours, depending on how crowded Masjid al-Haram is. Tawaf and Sa'i each mean walking several kilometres, so wear comfortable footwear for the walk to the mosque and rest between the rites if you need to.",
    },
    {
      question: "How much hair should a woman cut after Umrah?",
      answer:
        "According to Saudi Arabia's Nusuk platform, a woman cuts about 1 to 2 cm from the ends of her hair.",
    },
    {
      question: "When can Umrah be performed?",
      answer:
        "At any time of the year except during the Hajj period.",
    },
    {
      question: "Do I have to cut my hair straight after Sa'i?",
      answer:
        "No. Nusuk says you may wait until you return to where you are staying, and have it cut by yourself or someone staying with you. You remain in Ihram, with its restrictions, until the hair is cut.",
    },
  ],
  sources: [
    { label: "Nusuk — Umrah Journey (rites of Umrah)", url: SOURCES.journey },
    { label: "Nusuk — Navigating the Kingdom", url: SOURCES.navigating },
    { label: "Nusuk — Makkah & Madinah", url: SOURCES.makkahMadinah },
    { label: "Nusuk — Help & Support", url: SOURCES.nusukFaq },
    {
      label: "Ministry of Hajj and Umrah, Saudi Arabia — Miqaats",
      url: SOURCES.miqaats,
    },
    {
      label: "Ministry of Hajj and Umrah, Saudi Arabia — Things to remember",
      url: SOURCES.thingsToRemember,
    },
  ],
};
